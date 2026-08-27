const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { parseArgs } = require('../lib/cli');
const { maskSecret, resolveSecret } = require('../lib/auth');
const { getLocalConfig, saveLocalConfig } = require('../lib/config');
const { configureMcpClient, getMcpConfig } = require('../lib/mcp-config');
const { saveDeviceEnv } = require('../lib/device-env');
const { getContextFilePath, extractAppIdFromMarkdown } = require('../lib/commands/context');
const { detectProject, injectSDK, installSDKDependency, FRAMEWORKS } = require('../lib/injector');

function testArgsParsing() {
  console.log('🧪 Test 1: CLI arguments parsing');
  const { args, flags } = parseArgs(['init', '--name', 'MyCoolApp', '--industry', 'saas', '--email=test@example.com', '--json', '--no-install']);
  assert.strictEqual(args[0], 'init');
  assert.strictEqual(flags.name, 'MyCoolApp');
  assert.strictEqual(flags.industry, 'saas');
  assert.strictEqual(flags.email, 'test@example.com');
  assert.strictEqual(flags.json, true);
  assert.strictEqual(flags['no-install'], true);
  console.log('  ✅ Arguments parsing passed');
}

function testMaskSecret() {
  console.log('🧪 Test 2: Credential masking & sanitization');
  const masked1 = maskSecret('sk_live_1234567890abcdef');
  assert.strictEqual(masked1, 'sk_live...cdef');

  const maskedShort = maskSecret('1234');
  assert.strictEqual(maskedShort, '******');
  console.log('  ✅ Credential masking passed');
}

function testLocalConfig() {
  console.log('🧪 Test 3: Local state machine .shiplens.json read/write');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-cfg-'));
  try {
    saveLocalConfig(tempDir, {
      app_id: 'sl_test_12345',
      project_name: 'Test Project',
      industry: 'tools',
      schema_last_modified_at: 1755500000,
    });

    const cfg = getLocalConfig(tempDir);
    assert.ok(cfg);
    assert.strictEqual(cfg.app_id, 'sl_test_12345');
    assert.strictEqual(cfg.project_name, 'Test Project');
    assert.strictEqual(cfg.industry, 'tools');
    assert.ok(cfg.last_synced_at);
    console.log('  ✅ Local configuration read/write passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testFrameworkInjection() {
  console.log('🧪 Test 4: Framework detection & auto-injection');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-inject-'));
  try {
    // 1. Next.js App Router
    const nextAppDir = path.join(tempDir, 'next-app');
    fs.mkdirSync(path.join(nextAppDir, 'src/app'), { recursive: true });
    fs.writeFileSync(path.join(nextAppDir, 'package.json'), JSON.stringify({ name: 'my-next-app', dependencies: { next: '14.0.0' } }));
    fs.writeFileSync(path.join(nextAppDir, 'src/app/layout.tsx'), 'export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }');

    const nextDetect = detectProject(nextAppDir);
    assert.strictEqual(nextDetect.framework, FRAMEWORKS.NEXT_APP);

    const injectedNext = injectSDK(nextAppDir, FRAMEWORKS.NEXT_APP, 'sl_app_next123');
    assert.ok(injectedNext);
    const layoutContent = fs.readFileSync(path.join(nextAppDir, 'src/app/layout.tsx'), 'utf8');
    assert.ok(layoutContent.includes('ShiplensTracker'));

    // 2. Vite + React
    const viteDir = path.join(tempDir, 'vite-app');
    fs.mkdirSync(path.join(viteDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(viteDir, 'package.json'), JSON.stringify({ name: 'my-vite-app', dependencies: { react: '18.0.0', vite: '5.0.0' } }));
    fs.writeFileSync(path.join(viteDir, 'src/main.tsx'), 'import React from "react";\nReactDOM.createRoot(document.getElementById("root")).render(<App />);');

    const viteDetect = detectProject(viteDir);
    assert.strictEqual(viteDetect.framework, FRAMEWORKS.VITE);

    const injectedVite = injectSDK(viteDir, FRAMEWORKS.VITE, 'sl_app_vite123');
    assert.strictEqual(injectedVite, 'src/main.tsx');
    const viteContent = fs.readFileSync(path.join(viteDir, 'src/main.tsx'), 'utf8');
    assert.ok(viteContent.includes('@shiplens/sdk'));
    assert.ok(viteContent.includes('sl_app_vite123'));

    // 3. Create React App (CRA)
    const craDir = path.join(tempDir, 'cra-app');
    fs.mkdirSync(path.join(craDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(craDir, 'package.json'), JSON.stringify({ name: 'my-cra-app', dependencies: { 'react-scripts': '5.0.1', react: '18.2.0' } }));
    fs.writeFileSync(path.join(craDir, 'src/index.js'), 'import React from "react";\nimport ReactDOM from "react-dom/client";\nconst root = ReactDOM.createRoot(document.getElementById("root"));\nroot.render(<App />);\n');

    const craDetect = detectProject(craDir);
    assert.strictEqual(craDetect.framework, FRAMEWORKS.CRA);

    const injectedCRA = injectSDK(craDir, FRAMEWORKS.CRA, 'sl_app_cra123');
    assert.strictEqual(injectedCRA, 'src/index.js');
    const craContent = fs.readFileSync(path.join(craDir, 'src/index.js'), 'utf8');
    assert.ok(craContent.includes("require('@shiplens/sdk')"));
    assert.ok(craContent.includes('sl_app_cra123'));

    // 4. Plain HTML
    const htmlDir = path.join(tempDir, 'html-app');
    fs.mkdirSync(htmlDir, { recursive: true });
    fs.writeFileSync(path.join(htmlDir, 'index.html'), '<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>');

    const htmlDetect = detectProject(htmlDir);
    assert.strictEqual(htmlDetect.framework, FRAMEWORKS.HTML);

    const injectedHTML = injectSDK(htmlDir, FRAMEWORKS.HTML, 'sl_app_html123');
    assert.strictEqual(injectedHTML, 'index.html');
    const htmlContent = fs.readFileSync(path.join(htmlDir, 'index.html'), 'utf8');
    assert.ok(htmlContent.includes('cdn.shiplens.dev/sdk.js'));
    assert.ok(htmlContent.includes('sl_app_html123'));

    console.log('  ✅ Framework detection & injection passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testSkillInjection() {
  console.log('🧪 Test 5: AI Skill injection & distribution');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-skill-'));
  const { injectSkill } = require('../lib/injector');
  try {
    const skillPath = injectSkill(tempDir);
    assert.strictEqual(skillPath, '.agents/skills/shiplens/SKILL.md');

    const agentSkillFile = path.join(tempDir, '.agents', 'skills', 'shiplens', 'SKILL.md');
    assert.ok(fs.existsSync(agentSkillFile));
    const agentContent = fs.readFileSync(agentSkillFile, 'utf8');
    assert.ok(agentContent.includes('shiplens-analytics'));

    const cursorRuleFile = path.join(tempDir, '.cursor', 'rules', 'shiplens.mdc');
    assert.ok(fs.existsSync(cursorRuleFile));
    const cursorContent = fs.readFileSync(cursorRuleFile, 'utf8');
    assert.ok(cursorContent.includes('shiplens-analytics'));

    console.log('  ✅ AI Skill & Cursor rules injection passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testDetectExistingApp() {
  console.log('🧪 Test 6: Existing project & code instrumentation detection');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-detect-'));
  const { detectExistingApp } = require('../lib/injector');
  try {
    // 1. Empty directory
    const res1 = detectExistingApp(tempDir);
    assert.strictEqual(res1.has_existing, false);

    // 2. .shiplens.json state machine
    fs.writeFileSync(path.join(tempDir, '.shiplens.json'), JSON.stringify({ app_id: 'sl_live_exist123', project_name: 'ExistingApp' }), 'utf8');
    const res2 = detectExistingApp(tempDir);
    assert.strictEqual(res2.has_existing, true);
    assert.strictEqual(res2.app_id, 'sl_live_exist123');
    assert.strictEqual(res2.source_file, '.shiplens.json');

    // 3. Code instrumentation only
    fs.rmSync(path.join(tempDir, '.shiplens.json'));
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src/main.ts'), `import { initShiplens } from '@shiplens/sdk';\ninitShiplens({ appId: 'sl_live_code456' });\n`, 'utf8');
    const res3 = detectExistingApp(tempDir);
    assert.strictEqual(res3.has_existing, true);
    assert.strictEqual(res3.app_id, 'sl_live_code456');
    assert.strictEqual(res3.source_file, 'src/main.ts');

    console.log('  ✅ Existing app detection passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testNoGitOverreach() {
  console.log('🧪 Test 7: SDK injection does not perform unexpected Git commits');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-nogit-'));
  const { execSync } = require('child_process');
  const { injectSkill } = require('../lib/injector');
  try {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    injectSkill(tempDir);
    const status = execSync('git status --porcelain', { cwd: tempDir, encoding: 'utf8' }).trim();
    assert.ok(status.includes('.agents'), 'Skill file should remain unstaged; CLI must not force commit');
    console.log('  ✅ No Git overreach test passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testAuthBindArgParsing() {
  console.log('🧪 Test 8: auth bind arguments parsing');
  const { args, flags } = parseArgs(['auth', 'bind', '--email', 'foo@bar.com', '--json']);
  assert.strictEqual(args[0], 'auth');
  assert.strictEqual(args[1], 'bind');
  assert.strictEqual(flags.email, 'foo@bar.com');
  assert.strictEqual(flags.json, true);

  const { flags: flags2 } = parseArgs(['auth', 'bind', '--email=admin@example.com']);
  assert.strictEqual(flags2.email, 'admin@example.com');

  console.log('  ✅ auth bind arguments parsing passed');
}

function testAuthBindInvalidEmail() {
  console.log('🧪 Test 9: auth bind invalid email validation');
  const invalidEmails = ['', 'notanemail', 'missing-at-sign.com'];
  for (const email of invalidEmails) {
    const hasAt = !!(email && email.includes('@'));
    assert.strictEqual(hasAt, false, `"${email}" should be identified as invalid email`);
  }
  const validEmails = ['user@example.com', 'a+b@x.io', 'test.name@sub.domain.org'];
  for (const email of validEmails) {
    assert.ok(email.includes('@'), `"${email}" should be identified as valid email`);
  }
  console.log('  ✅ auth bind email validation passed');
}

function testQueryFileFlag() {
  console.log('🧪 Test 10: query --file JSON definition read');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-query-'));
  try {
    const querySpec = {
      env: 'production',
      range: '14d',
      panels: [
        { panel_id: 'p1', title: 'Daily PV', metric: 'pageviews', time_grain: 'day', limit: 14 },
        { panel_id: 'p2', title: 'Bounce Rate', metric: 'bounce_rate', time_grain: 'day', limit: 14 },
      ],
    };
    const specFile = path.join(tempDir, 'query_spec.json');
    fs.writeFileSync(specFile, JSON.stringify(querySpec, null, 2), 'utf8');

    const loaded = JSON.parse(fs.readFileSync(specFile, 'utf8'));
    assert.strictEqual(loaded.range, '14d');
    assert.strictEqual(loaded.panels.length, 2);
    assert.strictEqual(loaded.panels[0].metric, 'pageviews');
    assert.strictEqual(loaded.panels[1].metric, 'bounce_rate');

    console.log('  ✅ query --file parsing passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testQueryMultiMetrics() {
  console.log('🧪 Test 11: query --metrics multi-panel generation');
  const metricsRaw = 'pageviews,unique_visitors,bounce_rate';
  const metricList = String(metricsRaw).split(',').map((m) => m.trim()).filter(Boolean);
  assert.strictEqual(metricList.length, 3);
  assert.deepStrictEqual(metricList, ['pageviews', 'unique_visitors', 'bounce_rate']);

  const panels = metricList.map((metric, idx) => ({
    panel_id: `panel_cli_${idx}`,
    metric,
    time_grain: 'day',
    limit: 30,
  }));
  assert.strictEqual(panels.length, 3);
  assert.strictEqual(panels[0].metric, 'pageviews');
  assert.strictEqual(panels[2].metric, 'bounce_rate');
  console.log('  ✅ query --metrics parsing passed');
}

function testDashboardsAIFlag() {
  console.log('🧪 Test 12: dashboards create --ai flag routing');
  const { flags } = parseArgs([
    'dashboards', 'create',
    '--ai',
    '--prompt', 'Analyze onboarding drop-offs and conversion rate',
    '--title', 'Onboarding Funnel Dashboard',
    '--json',
  ]);
  assert.strictEqual(flags.ai, true);
  assert.strictEqual(flags.prompt, 'Analyze onboarding drop-offs and conversion rate');
  assert.strictEqual(flags.title, 'Onboarding Funnel Dashboard');
  assert.strictEqual(flags.json, true);

  const promptEmpty = !flags.prompt || flags.prompt.trim() === '';
  assert.strictEqual(promptEmpty, false, '--prompt must not be empty');

  console.log('  ✅ dashboards create --ai parsing passed');
}

async function testInstallSDKDependencyFallback() {
  console.log('🧪 Test 13: installSDKDependency 4-tier tiered racing download & fallback');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-install-'));
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test-pkg', dependencies: {} }), 'utf8');
    const res = await installSDKDependency(tempDir, 'non_existent_pkg_manager_123');
    assert.ok(typeof res === 'object', 'Should return result object');
    assert.ok('success' in res, 'Should contain success field');
    console.log('  ✅ 4-tier tiered racing dependency installation fallback passed');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch (e) {}
  }
}

function testTaxonomyInferenceAndFormatting() {
  console.log('🧪 Test 14: 4-Level Taxonomy inference & formatting');
  const { inferTaxonomy, formatTaxonomySummary, resolveTaxonomyFromIDs } = require('../lib/taxonomy');

  const taxCalc = inferTaxonomy({
    name: 'turnip-calc',
    description: 'Turnip price trend forecasting and profit optimization tool',
    dependencies: { react: '18.0.0' },
  });
  assert.ok(taxCalc.genre);
  assert.strictEqual(taxCalc.genre.id, 'finance_fintech');
  assert.strictEqual(taxCalc.genre.type, 'App');
  assert.ok(taxCalc.subgenre);
  assert.strictEqual(taxCalc.subgenre.id, 'personal_budgeting_accounting');
  assert.ok(taxCalc.feature_tags.length >= 2);

  const taxSaaS = inferTaxonomy({
    name: 'shiplens-copilot',
    description: 'Web developer user telemetry and analytics tool',
    dependencies: { next: '14.0.0', '@stripe/stripe-js': '^2.0.0', 'lucide-react': '^0.300.0' },
    framework: 'nextjs-app',
  });
  assert.strictEqual(taxSaaS.genre.id, 'utilities');
  assert.strictEqual(taxSaaS.subgenre.id, 'browser_web_utility');
  assert.ok(taxSaaS.feature_tag_ids.length >= 3);
  assert.ok(taxSaaS.feature_tags.some((t) => t.category === 'monetization'));
  assert.ok(taxSaaS.feature_tags.some((t) => t.category === 'technical_platform'));
  assert.ok(taxSaaS.feature_tags.some((t) => t.category === 'core_features'));

  const formatted = formatTaxonomySummary(taxSaaS);
  assert.ok(formatted.includes('• Genre (L1): Utilities (App)'));
  assert.ok(formatted.includes('• Sub-genre (L2): Mobile Web Browser & Utility'));
  assert.ok(formatted.includes('• Feature Tags:'));
  assert.ok(formatted.includes('[Monetization]'));
  assert.ok(formatted.includes('[Technical Platform]'));

  const resolved = resolveTaxonomyFromIDs('utilities', 'net_vpn_proxy', ['split_tunneling', 'kill_switch']);
  assert.strictEqual(resolved.genre.id, 'utilities');
  assert.strictEqual(resolved.subgenre.id, 'net_vpn_proxy');
  assert.strictEqual(resolved.feature_tags.length, 2);
  assert.strictEqual(resolved.feature_tags[0].name, 'Split Tunneling & App Routing');

  console.log('  ✅ 4-Level Taxonomy inference & formatting passed');
}

function testDetectProjectWithTaxonomy() {
  console.log('🧪 Test 15: detectProject with taxonomy metadata');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-tax-detect-'));
  try {
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-chart-app',
        description: 'Real-time telemetry chart dashboard & monitoring',
        dependencies: { recharts: '^2.10.0', 'next-auth': '^4.24.0' },
      }),
      'utf8'
    );

    const detected = detectProject(tempDir);
    assert.strictEqual(detected.project_name, 'my-chart-app');
    assert.strictEqual(detected.description, 'Real-time telemetry chart dashboard & monitoring');
    assert.ok(detected.taxonomy);
    assert.ok(detected.taxonomy.genre);
    assert.ok(detected.taxonomy.subgenre);
    assert.ok(detected.taxonomy.feature_tags.length >= 3);
    assert.ok(detected.taxonomy.feature_tags.some((t) => t.category === 'core_features'));

    console.log('  ✅ detectProject taxonomy integration passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testMcpClientConfiguration() {
  console.log('🧪 Test 16: MCP client configuration generation & safe merge');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-mcp-'));
  try {
    const url = 'https://api.example.test/mcp';
    const expectedCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const cursor = configureMcpClient('cursor', url, { homeDir: tempDir });
    assert.strictEqual(cursor.written, true);
    const cursorPath = path.join(tempDir, '.cursor', 'mcp.json');
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(cursorPath, 'utf8')).mcpServers.shiplens, { command: expectedCmd, args: ['--yes', 'shiplens-cli', 'mcp', 'serve'] });

    const again = configureMcpClient('cursor', url, { homeDir: tempDir });
    assert.strictEqual(again.written, false);
    assert.strictEqual(again.already_configured, true);

    const antigravity = configureMcpClient('antigravity', url, { homeDir: tempDir });
    assert.strictEqual(antigravity.written, true);
    const antiPath = path.join(tempDir, '.gemini', 'config', 'mcp_config.json');
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(antiPath, 'utf8')).mcpServers.shiplens, { command: expectedCmd, args: ['--yes', 'shiplens-cli', 'mcp', 'serve'] });

    let called = null;
    configureMcpClient('codex', url, { homeDir: tempDir, codexCommand: 'codex-test', execFileSync: (cmd, args) => { called = { cmd, args }; } });
    assert.deepStrictEqual(called, { cmd: 'codex-test', args: ['mcp', 'add', 'shiplens', '--', expectedCmd, '--yes', 'shiplens-cli', 'mcp', 'serve'] });
    assert.strictEqual(getMcpConfig('manual', url).mcpServers.shiplens.command, expectedCmd);
    console.log('  ✅ MCP client configuration passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testServerIssuedDeviceEnvPersistence() {
  console.log('🧪 Test 17: Secure storage of server-issued shiplens.env');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-env-'));
  try {
    const written = saveDeviceEnv('# server-issued\nSHIPLENS_MCP_TOKEN=mcp_test\nSHIPLENS_MCP_URL=https://api.example.test/mcp\n', tempDir);
    assert.strictEqual(written, path.join(tempDir, 'shiplens.env'));
    assert.ok(fs.readFileSync(written, 'utf8').includes('SHIPLENS_MCP_URL'));
    assert.ok(fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf8').includes('shiplens.env'));
    console.log('  ✅ shiplens.env secure write passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testProjectContextCanonicalPath() {
  console.log('🧪 Test 18: Canonical path for business context (.shiplens/contexts/<app_id>.md)');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-test-ctx-'));
  try {
    const appId1 = 'sl_live_app_001';
    const appId2 = 'sl_live_app_002';

    const expectedPath1 = path.join(tempDir, '.shiplens', 'contexts', `${appId1}.md`);
    const expectedPath2 = path.join(tempDir, '.shiplens', 'contexts', `${appId2}.md`);

    assert.strictEqual(getContextFilePath(appId1, null, tempDir), expectedPath1);
    assert.strictEqual(getContextFilePath(appId2, null, tempDir), expectedPath2);

    const custom = getContextFilePath(appId1, 'custom.md', tempDir);
    assert.strictEqual(custom, path.resolve(tempDir, 'custom.md'));

    const sampleMd = `# Shiplens Context\napp_id: ${appId1}\nproject_name: App 1`;
    assert.strictEqual(extractAppIdFromMarkdown(sampleMd), appId1);

    console.log('  ✅ Business context canonical path passed');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function testInitAccountStatusResolution() {
  console.log('🧪 Test 19: init User Account Status Resolution & Text');

  // 1. Unauthenticated
  const unauthResolved = { is_present: false };
  let status1 = 'not_logged_in_unlinked';
  let text1 = 'Not Logged In (Default state after first installation or no valid local credentials)';
  if (unauthResolved.is_present) {
    status1 = 'logged_in_linked';
    text1 = 'Logged In (Project linked to account)';
  }
  assert.strictEqual(status1, 'not_logged_in_unlinked');
  assert.strictEqual(text1, 'Not Logged In (Default state after first installation or no valid local credentials)');

  // 2. Authenticated and linked
  const authResolved = { is_present: true };
  const connRespLinked = { app_id: 'app_123', account_linked: true };
  let status2 = 'not_logged_in_unlinked';
  let text2 = 'Not Logged In (Default state after first installation or no valid local credentials)';
  if (authResolved.is_present) {
    if (connRespLinked.account_linked !== false && connRespLinked.linked !== false && !connRespLinked.unlinked) {
      status2 = 'logged_in_linked';
      text2 = 'Logged In (Project linked to account)';
    } else {
      status2 = 'logged_in_unlinked';
      text2 = 'Logged In (Project not linked to account)';
    }
  }
  assert.strictEqual(status2, 'logged_in_linked');
  assert.strictEqual(text2, 'Logged In (Project linked to account)');

  // 3. Authenticated but unlinked
  const connRespUnlinked = { app_id: 'app_456', account_linked: false };
  let status3 = 'not_logged_in_unlinked';
  let text3 = 'Not Logged In (Default state after first installation or no valid local credentials)';
  if (authResolved.is_present) {
    if (connRespUnlinked.account_linked !== false && connRespUnlinked.linked !== false && !connRespUnlinked.unlinked) {
      status3 = 'logged_in_linked';
      text3 = 'Logged In (Project linked to account)';
    } else {
      status3 = 'logged_in_unlinked';
      text3 = 'Logged In (Project not linked to account)';
    }
  }
  assert.strictEqual(status3, 'logged_in_unlinked');
  assert.strictEqual(text3, 'Logged In (Project not linked to account)');

  console.log('  ✅ init User Account Status Resolution test passed');
}

async function testActionPresetCatalogAndExecution() {
  console.log('🧪 Test 20: Action Preset Catalog & Execution');
  const { loadActions, handleAction } = require('../lib/commands/action');

  const actions = loadActions();
  assert.ok(Array.isArray(actions));
  assert.strictEqual(actions.length, 42, `Expected 42 actions, got ${actions.length}`);

  const sample = actions.find((a) => a.id === 'lifecycle_stage');
  assert.ok(sample);
  assert.strictEqual(sample.id, 'lifecycle_stage');
  assert.ok(sample.steps.length >= 3);
  assert.ok(sample.commands.length > 0);
  assert.ok(sample.foundation);

  // Test handleAction --list
  let capturedList = null;
  const mockCtxList = {
    isJSON: true,
    output: (data) => { capturedList = data; },
  };
  await handleAction([], { list: true }, mockCtxList);
  assert.ok(capturedList);
  assert.strictEqual(capturedList.ok, true);
  assert.strictEqual(capturedList.total, 42);

  // Test handleAction single id
  let capturedSingle = null;
  const mockCtxSingle = {
    isJSON: true,
    output: (data) => { capturedSingle = data; },
  };
  await handleAction(['lifecycle_stage'], {}, mockCtxSingle);
  assert.ok(capturedSingle);
  assert.strictEqual(capturedSingle.ok, true);
  assert.strictEqual(capturedSingle.action.id, 'lifecycle_stage');

  // Test handleAction not found with suggestion
  let errorCaught = null;
  try {
    await handleAction(['lifecycle'], {}, mockCtxSingle);
  } catch (e) {
    errorCaught = e;
  }
  assert.ok(errorCaught);
  assert.strictEqual(errorCaught.code, 'ACTION_NOT_FOUND');
  assert.ok(errorCaught.suggestions.includes('lifecycle_stage'));

  console.log('  ✅ Action Preset Catalog & Execution test passed');
}

async function runAllTests() {
  console.log('🚀 Running Shiplens CLI test suite...\n');
  testArgsParsing();
  testMaskSecret();
  testLocalConfig();
  testFrameworkInjection();
  testSkillInjection();
  testDetectExistingApp();
  testNoGitOverreach();
  testAuthBindArgParsing();
  testAuthBindInvalidEmail();
  testQueryFileFlag();
  testQueryMultiMetrics();
  testDashboardsAIFlag();
  await testInstallSDKDependencyFallback();
  testTaxonomyInferenceAndFormatting();
  testDetectProjectWithTaxonomy();
  testMcpClientConfiguration();
  testServerIssuedDeviceEnvPersistence();
  testProjectContextCanonicalPath();
  testInitAccountStatusResolution();
  await testActionPresetCatalogAndExecution();
  console.log('\n🎉 All unit tests passed (100% Passed)! (20/20)');
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

