const readline = require('readline');
const { detectProject, detectExistingApp, injectSDK, injectSkill, installSDKDependency, getGitEmail, autoGitCommit } = require('../injector');
const { saveLocalConfig } = require('../config');
const { saveDeviceEnv } = require('../device-env');
const { resolveTaxonomyFromIDs, formatTaxonomySummary } = require('../taxonomy');

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
  if (existing.has_existing && !flags.force) {
    if (ctx.isJSON) {
      const result = {
        ok: false,
        code: 'PROJECT_EXISTS_LOCALLY',
        message: `Existing Shiplens configuration detected (App ID: ${existing.app_id}) in ${existing.source_file}. Use --force to overwrite.`,
        existing_app_id: existing.app_id,
        source_file: existing.source_file,
        project_name: existing.project_name || projectName,
        dashboard_url: `${ctx.client.baseURL}/dashboard/${existing.app_id}`,
      };
      ctx.output(result);
      process.exitCode = 1;
      return;
    } else if (!process.stdin.isTTY) {
      console.log(`\n⚠️  Existing Shiplens project detected!`);
      console.log(`📌 App ID: ${existing.app_id} (Source: ${existing.source_file})`);
      console.log(`📊 Dashboard: ${ctx.client.baseURL}/dashboard/${existing.app_id}`);
      console.log(`🛑 Non-interactive terminal detected (CI/Agent). Existing configuration preserved.`);
      console.log(`💡 To overwrite and create a new project, run with --force:`);
      console.log(`   npx @shiplens/cli init --force\n`);
      return;
    } else {
      console.log(`\n⚠️  Existing Shiplens project detected!`);
      console.log(`📌 App ID: ${existing.app_id} (Source: ${existing.source_file})`);
      console.log(`📊 Dashboard: ${ctx.client.baseURL}/dashboard/${existing.app_id}`);
      console.log(`\n💡 Option 1 [Recommended]: Keep existing setup and reuse App ID.`);
      console.log(`💡 Option 2: Run with --force to overwrite and create a new project:`);
      console.log(`   npx @shiplens/cli init --force\n`);

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const confirmed = await new Promise((resolve) => {
        rl.question('Overwrite and create a new project? (y/N): ', (ans) => {
          rl.close();
          resolve(ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes');
        });
      });
      if (!confirmed) {
        console.log('🛑 Operation cancelled. Existing configuration preserved.');
        return;
      }
    }
  }

  // 2. Inject AI Skill (.agents/skills/shiplens/SKILL.md & Cursor rules)
  const skillFile = injectSkill(wd);

  // 3. Register project on cloud
  let appId = '';
  let dashboardUrl = '';
  let accountStatus = 'not_logged_in_unlinked';
  let accountStatusText = 'Not Logged In (Project unlinked)';

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
      accountStatusText = 'Not Logged In (Project unlinked)';
    }
  } catch (netErr) {
    netErr.code = netErr.code || 'CONNECT_FAILED';
    throw netErr;
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

  // 6. Install SDK dependency
  let installResult = { success: true, manager: 'skipped' };
  if (!flags['no-install'] && detected.package_manager) {
    installResult = await installSDKDependency(wd, detected.package_manager);
    if (!installResult.success) {
      const errMsg = `SDK installation failed: Unable to download @shiplens/sdk across all download sources (official npm registry, Alibaba Cloud npmmirror, GitHub mirror, and Shiplens CDN mirror).\n` +
        `Troubleshooting steps:\n` +
        `  1. Check your local network connection or HTTP proxy / VPN settings;\n` +
        `  2. Try running manually with Alibaba mirror: npm install @shiplens/sdk --registry=https://registry.npmmirror.com;\n` +
        `  3. Or install via official registry: npm install @shiplens/sdk;\n` +
        `  4. Visit https://shiplens.com for latest SDK status and installation guides.`;

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

  // 7. Bind email if specified
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

  // 8. Auto Git commit
  let gitCommitResult = { committed: false };
  if (!flags['no-commit']) {
    gitCommitResult = autoGitCommit(wd, 'feat: Integrate Shiplens SDK and configure dashboard');
  }

  const elapsed = Date.now() - start;
  const taxonomyFormatted = formatTaxonomySummary(taxonomy);

  const result = {
    ok: true,
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
    package_manager: detected.package_manager,
    auth_status: authStatus,
    shiplens_env_written: authStatus === 'magic_link_sent',
    activation_required: authStatus === 'pending',
    free_tier_info: '50,000 free events/month (~5,000 unique visitors)',
    bound_email: targetEmail || undefined,
    git_committed: gitCommitResult.committed,
    git_commit_hash: gitCommitResult.hash || undefined,
    elapsed_ms: elapsed,
    atomic_completed: true,
  };

  ctx.output(result, () => {
    console.log(`\n==================================================`);
    console.log(`✅ Shiplens SDK successfully integrated (${elapsed} ms)\n`);
    console.log(`📦 Project & Dashboard Information`);
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
    if (gitCommitResult.committed) {
      console.log(`Git Commit: Automatically committed changes (Commit: ${gitCommitResult.hash})`);
    }
    console.log(`🧠 AI Skill Ready: ${skillFile}`);
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
