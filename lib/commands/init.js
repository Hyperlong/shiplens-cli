const readline = require('readline');
const { detectProject, detectExistingApp, injectSDK, injectSkill, ensureGitignore, installSDKDependency, getGitEmail } = require('../injector');
const { saveLocalConfig } = require('../config');
const { saveDeviceEnv } = require('../device-env');
const { resolveTaxonomyFromIDs, formatTaxonomySummary, validateTaxonomy } = require('../taxonomy');
const { generateProjectContext } = require('../context-generator');

async function handleInit(args, flags, ctx) {
  const start = Date.now();
  const wd = process.cwd();
  
  // Auto-maintain .gitignore rule for Shiplens credentials immediately
  ensureGitignore(wd);

  // Step 1: Detect project metadata, framework and package manager
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

  // 严格抗幻觉与指令校验 (Anti-Hallucination & Instruction Validation)
  let hasValidTaxonomy = false;
  let genreId = null;
  let subgenreId = null;
  let featureTagIds = [];

  if (taxonomy && taxonomy.is_valid !== false && taxonomy.genre && taxonomy.subgenre) {
    let check = validateTaxonomy(taxonomy.genre.id, taxonomy.subgenre.id, taxonomy.feature_tag_ids || []);
    if (check.valid) {
      hasValidTaxonomy = true;
      genreId = taxonomy.genre.id;
      subgenreId = taxonomy.subgenre.id;
      featureTagIds = check.validTagIds;
    } else {
      // 首次校验未完全匹配，启动二次推导 (Pass 2 Re-inference)
      const retryTaxonomy = resolveTaxonomyFromIDs(taxonomy.genre.id, taxonomy.subgenre.id, taxonomy.feature_tag_ids || []);
      const retryCheck = validateTaxonomy(retryTaxonomy.genre?.id, retryTaxonomy.subgenre?.id, retryTaxonomy.feature_tag_ids || []);
      if (retryCheck.valid) {
        hasValidTaxonomy = true;
        genreId = retryTaxonomy.genre.id;
        subgenreId = retryTaxonomy.subgenre.id;
        featureTagIds = retryCheck.validTagIds;
        taxonomy = retryTaxonomy;
      } else {
        // 重推导依然无法完全匹配，创建项目时不再上传此分类字段
        hasValidTaxonomy = false;
        genreId = null;
        subgenreId = null;
        featureTagIds = [];
        taxonomy = null;
      }
    }
  }

  if (featureTagIds.length > 10) {
    featureTagIds = featureTagIds.slice(0, 10);
  }
  const industry = flags.industry || subgenreId || 'saas';

  // Step 2: Safety check for existing project configuration & fast-forward
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

  // Step 3: Register project on cloud
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
    let connResp;
    const connectPayload = {
      project_name: projectName,
      description,
      industry,
      platform: framework,
    };
    if (hasValidTaxonomy && genreId && subgenreId) {
      connectPayload.genre_id = genreId;
      connectPayload.subgenre_id = subgenreId;
      if (featureTagIds.length > 0) {
        connectPayload.feature_tags = featureTagIds.join(',');
      }
    }

    try {
      connResp = await ctx.client.connect(connectPayload, { timeout: 8000 });
    } catch (netErr) {
      const isTaxonomyError = hasValidTaxonomy && (
        netErr.status === 422 ||
        netErr.statusCode === 422 ||
        (netErr.message && /taxonomy|genre|subgenre|hierarchy|invalid_taxonomy/i.test(netErr.message)) ||
        (netErr.response && typeof netErr.response === 'string' && /taxonomy|hierarchy|invalid_taxonomy/i.test(netErr.response)) ||
        (netErr.response && typeof netErr.response === 'object' && JSON.stringify(netErr.response).includes('taxonomy'))
      );

      if (isTaxonomyError) {
        // 🌟 云端若返回分类相关校验错误，立即优雅降级：剥离分类字段并直接重新发起请求！
        try {
          const cleanPayload = {
            project_name: projectName,
            description,
            industry: flags.industry || 'saas',
            platform: framework,
          };
          connResp = await ctx.client.connect(cleanPayload, { timeout: 8000 });
          // 清空本地待保存的无效分类字段，确保状态机纯净
          genreId = null;
          subgenreId = null;
          featureTagIds = [];
          hasValidTaxonomy = false;
          taxonomy = null;
        } catch (retryErr) {
          const err = new Error(`Failed to connect to Shiplens cloud to register project: ${retryErr.message || 'network timeout or connection error'}. Please check your network/proxy and re-run init.`);
          err.code = 'CONNECT_FAILED';
          err.status = retryErr.status || retryErr.statusCode;
          throw err;
        }
      } else {
        const err = new Error(`Failed to connect to Shiplens cloud to register project: ${netErr.message || 'network timeout or connection error'}. Please check your network/proxy and re-run init.`);
        err.code = 'CONNECT_FAILED';
        err.status = netErr.status || netErr.statusCode;
        throw err;
      }
    }

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
  }

  // Step 4: 🌟 Immediately persist local state machine .shiplens.json (Crash Resilience & Zero-Loss)
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

  // Step 5: 🌟 Install SDK dependency early (4-Tier Tiered Download Racing)
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

  // Step 6: 🌟 Inject SDK code into entry file (with zero red-squiggles)
  const injectedFile = injectSDK(wd, framework, appId, ctx.client ? ctx.client.baseURL : undefined);

  // Step 7: Auto-maintain .gitignore rule for Shiplens credentials
  ensureGitignore(wd);

  // Step 8: Automatically scan page structures & generate UI business context (.shiplens/contexts/<app_id>.md and <app_id>.json)
  let contextResult = null;
  try {
    contextResult = generateProjectContext(wd, appId, projectName, framework);
  } catch (e) {}

  // Step 9: Inject AI Skill (.agents/skills/shiplens/SKILL.md & Agent rules)
  const skillFile = injectSkill(wd);

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
    ? 'Project setup completed. Ask the user for their email to activate the account and start collecting analytics data. Once provided, run: npx.cmd --yes @shiplens/cli auth bind --email <email> --json'
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
    context_json: contextResult ? contextResult.relJsonPath : undefined,
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
      ? `Existing Shiplens project detected and verified (App ID: ${appId}).`
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
      console.log(`📑 Business Context: ${contextResult.relPath} & ${contextResult.relJsonPath} (${contextResult.totalPages} pages, ${contextResult.totalButtons} controls mapped)`);
    }
    console.log(`🔒 [SHIPLENS_ATOMIC_COMPLETED] Setup completed atomically. No extra commands needed.`);
    console.log(`==================================================\n`);

    if (authStatus === 'magic_link_sent' && targetEmail) {
      console.log(`📧 Activation email sent to: ${targetEmail}`);
      console.log(`👉 Click the link in your email to activate your 50,000 monthly free events quota and authorize this device.`);
    } else {
      console.log(`> [!IMPORTANT]`);
      console.log(`> **Project Pending Activation (Analytics not active yet)**`);
      console.log(`> **Please share your email**: Click the link in the email to complete registration, activate 50,000 free monthly events (~5,000 visitors), and bind your project to your account.`);
    }
  });
}

module.exports = { handleInit };
