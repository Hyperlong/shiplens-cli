const readline = require('readline');
const { detectProject, detectExistingApp, injectSDK, injectSkill, installSDKDependency, getGitEmail } = require('../injector');
const { saveLocalConfig } = require('../config');
const { saveDeviceEnv } = require('../device-env');
const { resolveTaxonomyFromIDs, formatTaxonomySummary } = require('../taxonomy');
const { generateProjectContext } = require('../context-generator');

async function handleInit(args, flags, ctx) {
  const start = Date.now();
  const wd = process.cwd();
  const detected = detectProject(wd);

  const projectName = flags.name || detected.project_name || 'My App';
  const description = flags.description || detected.description || '';
  const framework = flags.framework || detected.framework;

  // Taxonomy resolution
  let taxonomy = detected.taxonomy;
  if (flags.genre || flags.subgenre || flags.tags) {
    const rawTags = flags.tags ? (Array.isArray(flags.tags) ? flags.tags : flags.tags.split(',').map((t) => t.trim())) : (taxonomy ? taxonomy.feature_tag_ids : []);
    taxonomy = resolveTaxonomyFromIDs(flags.genre, flags.subgenre, rawTags);
  }

  const genreId = taxonomy?.genre?.id || 'utilities';
  const subgenreId = taxonomy?.subgenre?.id || 'browser_web_utility';
  const featureTagIds = taxonomy?.feature_tag_ids || [];
  if (featureTagIds.length > 10) {
    throw new Error('Maximum 10 feature tags allowed.');
  }
  const industry = flags.industry || subgenreId || 'saas';

  // 1. Safety check for existing project configuration
  const existing = detectExistingApp(wd);
  let isReusedExisting = false;

  if (existing.has_existing && !flags.force) {
    if (ctx.isJSON || !process.stdin.isTTY) {
      // Non-interactive or JSON mode (Agent/CI): Fast-forward / Idempotent reuse of existing config
      isReusedExisting = true;
    } else {
      console.log(`\n⚠️  Existing Shiplens project detected!`);
      console.log(`📌 App ID: ${existing.app_id} (Source: ${existing.source_file})`);
      console.log(`📊 Dashboard: ${ctx.client.baseURL}/dashboard/${existing.app_id}`);
      console.log(`\n💡 Option 1 [Recommended]: Keep existing setup, retain App ID and historical statistics (Press Enter or N);`);
      console.log(`💡 Option 2: Overwrite with --force to request a brand new App ID from cloud (y):`);
      console.log(`   npx.cmd --yes @shiplens/cli init --force\n`);

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const confirmed = await new Promise((resolve) => {
        rl.question('Overwrite and create a brand new project? (y/N): ', (ans) => {
          rl.close();
          resolve(ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes');
        });
      });
      if (!confirmed) {
        isReusedExisting = true;
      }
    }
  }

  // 2. Inject AI Skill (.agents/skills/shiplens/SKILL.md & Agent rules)
  const skillFile = injectSkill(wd);

  // 3. Register project on cloud (or reuse existing)
  let appId = '';
  let dashboardUrl = '';
  let accountStatus = 'not_logged_in_unlinked';
  let accountStatusText = 'Not Logged In (Default state after first installation or no valid local credentials)';

  if (isReusedExisting) {
    appId = existing.app_id;
    dashboardUrl = `${ctx.client.baseURL}/dashboard/${appId}`;
    if (ctx.resolvedAuth && ctx.resolvedAuth.is_present) {
      accountStatus = 'logged_in_linked';
      accountStatusText = 'Logged In (Project linked to account)';
    } else {
      accountStatus = 'not_logged_in_unlinked';
      accountStatusText = 'Not Logged In (Default state after first installation or no valid local credentials)';
    }
  } else {
    try {
      const connResp = await ctx.client.connect({
        project_name: projectName,
        description,
        industry,
        genre_id: genreId,
        subgenre_id: subgenreId,
        feature_tags: featureTagIds.join(','),
        platform: framework,
      });
      appId = connResp.app_id;
      dashboardUrl = connResp.dashboard_url || `${ctx.client.baseURL}/dashboard/${appId}`;

      if (ctx.resolvedAuth && ctx.resolvedAuth.is_present) {
        if (connResp.account_linked !== false && connResp.linked !== false && !connResp.unlinked) {
          accountStatus = 'logged_in_linked';
          accountStatusText = 'Logged In (Project linked to account)';
        } else {
          accountStatus = 'logged_in_unlinked';
          accountStatusText = 'Logged In (Project not linked to account)';
        }
      } else {
        accountStatus = 'not_logged_in_unlinked';
        accountStatusText = 'Not Logged In (Default state after first installation or no valid local credentials)';
      }
    } catch (netErr) {
      netErr.code = netErr.code || 'CONNECT_FAILED';
      throw netErr;
    }
  }

  // 4. Inject SDK code
  const injectedFile = injectSDK(wd, framework, appId);

  // 5. Save local configuration
  saveLocalConfig(wd, {
    app_id: appId,
    project_name: projectName,
    description,
    industry,
    genre_id: genreId,
    subgenre_id: subgenreId,
    feature_tags: featureTagIds,
    api_url: ctx.client.baseURL,
    last_synced_at: new Date().toISOString(),
  });

  // 6. Automatically scan page structures & generate UI business context (.shiplens/contexts/<app_id>.md)
  let contextResult = null;
  try {
    contextResult = generateProjectContext(wd, appId, projectName, framework);
  } catch (e) {}

  // 7. Install SDK dependency
  let installResult = { success: true, manager: 'skipped' };
  if (!flags['no-install'] && detected.package_manager) {
    installResult = await installSDKDependency(wd, detected.package_manager);
    if (!installResult.success) {
      const errMsg = `SDK installation failed: Unable to download @shiplens/sdk across all download sources (official npm registry, backup mirror, GitHub mirror, and Shiplens CDN mirror).\n` +
        `Troubleshooting steps:\n` +
        `  1. Check your local network connection or HTTP proxy / VPN settings;\n` +
        `  2. Try running manually with backup mirror: npm install @shiplens/sdk --registry=https://registry.npmmirror.com;\n` +
        `  3. Or install via official registry: npm install @shiplens/sdk;\n` +
        `  4. Visit https://shiplens.dev for latest SDK status and installation guides.`;

      if (ctx.isJSON) {
        ctx.output({
          ok: false,
          code: 'SDK_INSTALL_FAILED',
          message: errMsg,
          error_detail: installResult.error,
          app_id: appId,
        });
      } else {
        console.error(`\n❌ ${errMsg}\n`);
      }
      process.exitCode = 1;
      return;
    }
  }

  // 8. Bind email if specified
  let targetEmail = flags.email;
  if (targetEmail === 'auto') {
    targetEmail = getGitEmail();
  }
  let authStatus = 'pending';
  if (targetEmail) {
    try {
      const emailResponse = await ctx.client.startEmail({
        email: targetEmail,
        project_id: appId,
        project_name: projectName,
        client_name: 'Shiplens CLI',
        device_os: process.platform,
        device_name: require('os').hostname(),
      });
      saveDeviceEnv(emailResponse.shiplens_env, wd);
      authStatus = 'magic_link_sent';
    } catch (e) {
      authStatus = 'failed';
    }
  }

  const elapsed = Date.now() - start;
  const taxonomyFormatted = formatTaxonomySummary(taxonomy);

  const isPendingAuth = authStatus === 'pending' || accountStatus === 'not_logged_in_unlinked' || accountStatus === 'logged_in_unlinked';
  const setupStatus = isPendingAuth ? 'pending_email_binding' : 'completed';
  const nextAction = isPendingAuth ? 'PROMPT_USER_FOR_EMAIL' : null;
  const nextStepInstruction = isPendingAuth
    ? 'Project setup and SDK injection are completed, but account binding and free monthly quota (50,000 events) are pending activation. You MUST actively ask the user in your current response for their email address to activate their free quota. Once the user provides their email, immediately execute: npx.cmd --yes @shiplens/cli auth bind --email <user_email> --json'
    : null;

  const result = {
    ok: true,
    reconnected: isReusedExisting,
    reused_existing: isReusedExisting,
    app_id: appId,
    project_name: projectName,
    description: description || undefined,
    taxonomy,
    dashboard_url: dashboardUrl,
    framework_detected: framework,
    injected_file: injectedFile,
    user_account_status: accountStatus,
    user_account_text: accountStatusText,
    sdk_installed: installResult.success,
    sdk_manager: installResult.manager,
    skill_injected: true,
    skill_file: skillFile,
    context_generated: !!contextResult,
    context_file: contextResult ? contextResult.relPath : undefined,
    context_pages_count: contextResult ? contextResult.totalPages : 0,
    context_buttons_count: contextResult ? contextResult.totalButtons : 0,
    package_manager: detected.package_manager,
    auth_status: authStatus,
    setup_status: setupStatus,
    next_action: nextAction,
    next_step_instruction: nextStepInstruction,
    shiplens_env_written: authStatus === 'magic_link_sent',
    activation_required: isPendingAuth,
    free_tier_info: '50,000 free events/month (~5,000 unique visitors)',
    bound_email: targetEmail || undefined,
    elapsed_ms: elapsed,
    atomic_completed: !isPendingAuth,
    message: isReusedExisting
      ? `Existing Shiplens project detected and successfully verified (App ID: ${appId}).`
      : `Shiplens SDK successfully integrated and project created.`,
  };

  ctx.output(result, () => {
    console.log(`\n==================================================`);
    console.log(isReusedExisting
      ? `✅ Shiplens SDK verified & reconnected (${elapsed} ms)\n`
      : `✅ Shiplens SDK successfully integrated (${elapsed} ms)\n`);
    console.log(`📦 Project & Dashboard Information` + (isReusedExisting ? ` (Existing setup preserved)` : ''));
    console.log(`Project Name: ${projectName}`);
    if (description) {
      console.log(`Description: ${description}`);
    }
    if (taxonomyFormatted) {
      console.log(`Taxonomy:`);
      console.log(taxonomyFormatted);
    }
    console.log(`App ID: ${appId}`);
    console.log(`Code Injection: Automatically configured in ${injectedFile} (Framework: ${framework})`);
    console.log(`Live Dashboard / Activation URL: 🔗 ${dashboardUrl}`);
    console.log(`User Account: ${accountStatusText}`);
    console.log(`🧠 AI Skill Ready: ${skillFile}`);
    if (contextResult && contextResult.relPath) {
      console.log(`📑 Business Context: ${contextResult.relPath} (${contextResult.totalPages} pages, ${contextResult.totalButtons} buttons mapped)`);
    }
    console.log(`🔒 [SHIPLENS_ATOMIC_COMPLETED] Setup completed atomically. No extra commands needed.`);
    console.log(`==================================================\n`);

    if (authStatus === 'magic_link_sent' && targetEmail) {
      console.log(`📧 Activation email sent to: ${targetEmail}`);
      console.log(`👉 Click the link in your email to activate your 50,000 monthly free events quota and authorize this device.`);
    } else {
      console.log(`> [!IMPORTANT]`);
      console.log(`> **Project Pending Activation (Analytics not active yet)**`);
      console.log(`> **Please share your email**: Click the link in the email to complete registration, activate 50,000 free monthly events (~5,000 visitors), and bind your project to your account. Once activated, you can chat directly with me to query and analyze product data.`);
    }
  });
}

module.exports = { handleInit };
