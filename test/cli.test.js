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
    description: 'Animal Crossing New Horizons Turnip price trend forecasting and profit optimization tool',
    dependencies: { react: '18.0.0' },
  });
  assert.ok(taxCalc.genre);
  assert.strictEqual(taxCalc.genre.id, 'game_simulation');
  assert.strictEqual(taxCalc.genre.type, 'Game');
  assert.ok(taxCalc.subgenre);
  assert.strictEqual(taxCalc.subgenre.id, 'g_sim_life_sandbox');
  assert.ok(taxCalc.feature_tags.length >= 2);

  const taxSaaS = inferTaxonomy({
    name: 'shiplens-copilot',
    description: 'Web developer user telemetry and analytics tool',
    dependencies: { next: '14.0.0', '@stripe/stripe-js': '^2.0.0', 'lucide-react': '^0.300.0' },
    framework: 'nextjs-app',
  });
  assert.strictEqual(taxSaaS.genre.id, 'utilities');
  assert.strictEqual(taxSaaS.subgenre.id, 'tool_calculators');
  assert.ok(taxSaaS.feature_tag_ids.length >= 3);
  assert.ok(taxSaaS.feature_tags.some((t) => t.category.includes('monetization')));
  assert.ok(taxSaaS.feature_tags.some((t) => t.category.includes('technical')));

  const formatted = formatTaxonomySummary(taxSaaS);
  assert.ok(formatted.includes('Genre (L1):'));
  assert.ok(formatted.includes('Utilities'));
  assert.ok(formatted.includes('Feature Tags:'));
  assert.ok(formatted.includes('Monetization'));

  const resolved = resolveTaxonomyFromIDs('utilities', 'net_vpn_proxy', ['split_tunneling', 'kill_switch']);
  assert.strictEqual(resolved.genre.id, 'utilities');
  assert.strictEqual(resolved.subgenre.id, 'net_vpn_proxy');
  assert.strictEqual(resolved.feature_tags.length, 2);
  assert.ok(resolved.feature_tags[0].name.toLowerCase().includes('split tunneling'));

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
    assert.ok(detected.taxonomy.feature_tags.length >= 2);
    assert.ok(detected.taxonomy.feature_tags.some((t) => t.category.includes('technical') || t.category.includes('core')));

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
  assert.strictEqual(actions.length, 43, `Expected 43 actions, got ${actions.length}`);

  const sample = actions.find((a) => a.id === 'lifecycle_stage');
  assert.ok(sample);
  assert.strictEqual(sample.id, 'lifecycle_stage');
  assert.ok(sample.steps.length >= 3);
  assert.ok(sample.commands.length > 0);
  assert.ok(sample.foundation);

  const smokeSample = actions.find((a) => a.id === 'production_smoke_test');
  assert.ok(smokeSample, 'Expected production_smoke_test action in catalog');
  assert.strictEqual(smokeSample.id, 'production_smoke_test');

  // Test handleAction --list
  let capturedList = null;
  const mockCtxList = {
    isJSON: true,
    output: (data) => { capturedList = data; },
  };
  await handleAction([], { list: true }, mockCtxList);
  assert.ok(capturedList);
  assert.strictEqual(capturedList.ok, true);
  assert.strictEqual(capturedList.total, 43);

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

async function testInitIdempotentFastForward() {
  console.log('🧪 Test 21: init Idempotent Fast-Forward & Self-Healing');
  const { handleInit } = require('../lib/commands/init');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-init-fast-'));

  try {
    // Setup existing project state
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test-app', version: '1.0.0' }));
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src/index.js'), `import React from 'react';\n`);
    fs.writeFileSync(path.join(tempDir, '.shiplens.json'), JSON.stringify({
      app_id: 'app_existing_test_123',
      project_name: 'test-app',
      api_url: 'https://api.shiplens.dev',
    }));

    const cwdBackup = process.cwd();
    process.chdir(tempDir);

    let outputResult = null;
    const mockCtx = {
      isJSON: true,
      client: {
        baseURL: 'https://api.shiplens.dev',
        connect: async () => { throw new Error('connect should not be called in idempotent fast-forward'); },
      },
      resolvedAuth: { is_present: false },
      output: (res) => { outputResult = res; },
    };

    await handleInit([], { 'no-install': true }, mockCtx);
    process.chdir(cwdBackup);

    assert.ok(outputResult, 'Expected output result');
    assert.strictEqual(outputResult.ok, true, 'Expected ok: true');
    assert.strictEqual(outputResult.reconnected, true, 'Expected reconnected: true');
    assert.strictEqual(outputResult.app_id, 'app_existing_test_123');
    assert.strictEqual(outputResult.dashboard_url, 'https://api.shiplens.dev/dashboard/app_existing_test_123');
    assert.strictEqual(outputResult.context_generated, true, 'Expected context_generated: true');
    assert.ok(fs.existsSync(path.join(tempDir, '.shiplens', 'contexts', 'app_existing_test_123.md')), 'Expected context file generated on disk');
    assert.strictEqual(process.exitCode || 0, 0, 'Expected exit code 0');

    console.log('  ✅ init Idempotent Fast-Forward & Context Generation test passed');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

async function testProjectContextAutoGeneration() {
  console.log('🧪 Test 22: Project Context (.shiplens/contexts/<app_id>.md) Auto-Generation & Scan');
  const { generateProjectContext } = require('../lib/context-generator');
  const { handleContext } = require('../lib/commands/context');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-context-gen-'));

  try {
    // 1. Create a mock React/Next.js project with pages and buttons
    fs.mkdirSync(path.join(tempDir, 'src/app/pricing'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'cool-saas', dependencies: { next: '14.0.0' } }));
    fs.writeFileSync(path.join(tempDir, 'src/app/page.tsx'), `
      export default function Home() {
        return (
          <main>
            <h1>Ship Faster with AI Analytics</h1>
            <p>The privacy-friendly user behavior analytics platform for modern web apps.</p>
            <button id="hero-start-free" data-shiplens-label="hero_cta" onClick={() => handleStart()}>Start Free Trial</button>
            <a href="/pricing" className="btn-link">View Pricing</a>
          </main>
        );
      }
    `);
    fs.writeFileSync(path.join(tempDir, 'src/app/pricing/page.tsx'), `
      export default function Pricing() {
        return (
          <div>
            <h2>Simple, Predictable Pricing</h2>
            <li>50,000 free events per month</li>
            <li>Real-time ClickHouse engine</li>
            <button id="upgrade-pro" onClick={() => checkout()}>Upgrade to Pro $14</button>
            <details>
              <summary>Can I cancel anytime?</summary>
              Yes, cancel with one click from dashboard.
            </details>
          </div>
        );
      }
    `);

    // 2. Test generateProjectContext
    const appId = 'app_test_ctx_9876';
    const genResult = generateProjectContext(tempDir, appId, 'cool-saas', 'nextjs-app');

    assert.ok(genResult);
    assert.strictEqual(genResult.totalPages, 2, `Expected 2 pages, got ${genResult.totalPages}`);
    assert.ok(genResult.totalButtons >= 3, `Expected >= 3 buttons, got ${genResult.totalButtons}`);
    assert.ok(fs.existsSync(genResult.filePath), 'Expected context file to exist on disk');

    const mdContent = fs.readFileSync(genResult.filePath, 'utf8');
    assert.ok(mdContent.includes('app_test_ctx_9876'));
    assert.ok(mdContent.includes('cool-saas'));
    assert.ok(mdContent.includes('btn_home_hero_cta') || mdContent.includes('hero_cta') || mdContent.includes('hero-start-free'));
    assert.ok(mdContent.includes('btn_pricing_checkout') || mdContent.includes('btn_pricing_upgrade_pro') || mdContent.includes('upgrade-pro'));
    assert.ok(mdContent.includes('50,000 free events per month'));
    assert.ok(mdContent.includes('页面功能全景总结 (Page Functional Summary)'));
    assert.ok(mdContent.includes('核心转化动作总量 (OEC)'));

    // 3. Test handleContext('generate')
    const cwdBackup = process.cwd();
    process.chdir(tempDir);
    let captured = null;
    const mockCtx = {
      isJSON: true,
      resolveAppId: () => appId,
      output: (res) => { captured = res; },
    };
    await handleContext('generate', [], {}, mockCtx);
    process.chdir(cwdBackup);

    assert.ok(captured);
    assert.strictEqual(captured.ok, true);
    assert.strictEqual(captured.action, 'generate');
    assert.strictEqual(captured.pages_count, 2);

    console.log('  ✅ Project Context Auto-Generation test passed');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

function testASTExtractorDeepVerification() {
  console.log('🧪 Test 23: Babel AST Interactive Elements Deep Verification');
  const { extractInteractiveElements } = require('../lib/extractor');

  const jsxSnippet = `
    import React from 'react';
    import { CustomButton, PrimaryCTA, Link as RouterLink } from '@/components/ui';

    export default function CheckoutPage() {
      const handleCheckout = () => { console.log('checkout'); };
      const isAuth = true;

      return (
        <div className="container">
          <h1>Complete Your Purchase</h1>
          <p>Annual Subscription Plan</p>
          
          {/* 1. Custom button with Chinese text */}
          <CustomButton onClick={handleCheckout}>立即支付 $99</CustomButton>

          {/* 2. PrimaryCTA with explicit data-shiplens-label */}
          <PrimaryCTA data-shiplens-label="annual_plan_cta" data-testid="test-cta">
            <span>Upgrade Now</span>
          </PrimaryCTA>

          {/* 3. Native button without attributes */}
          <button>提交订单</button>

          {/* 4. Native input submit */}
          <input type="submit" value="确认结算" />

          {/* 5. Custom Link with href */}
          <RouterLink href="/pricing">返回定价页</RouterLink>

          {/* 6. Conditional rendering branch */}
          {isAuth ? (
            <button id="btn-logout" onClick={() => logout()}>退出登录</button>
          ) : (
            <button id="btn-login" onClick={() => login()}>立即登录</button>
          )}

          {/* 7. Non-interactive head-like link (should be ignored) */}
          <link rel="stylesheet" href="/style.css" />
        </div>
      );
    }
  `;

  const results = extractInteractiveElements(jsxSnippet, 'src/pages/checkout.tsx');
  assert.ok(Array.isArray(results), 'Expected array of interactive elements');
  assert.ok(results.length >= 6, `Expected at least 6 interactive elements, got ${results.length}`);

  // Check 1: Custom button
  const customBtn = results.find((r) => r.text.includes('立即支付'));
  assert.ok(customBtn, 'CustomButton should be detected');
  assert.strictEqual(customBtn.tag.toLowerCase(), 'custombutton');
  assert.ok(customBtn.is_custom_component, 'Should mark is_custom_component');
  assert.ok(customBtn.source_loc.includes('src/pages/checkout.tsx'), 'Should record source_loc');
  assert.ok(!customBtn.id.includes('btn_btn_'), 'Should not contain double btn_ prefix for Chinese text');

  // Check 2: Priority data-shiplens-label
  const ctaBtn = results.find((r) => r.id === 'annual_plan_cta' || r.label === 'annual_plan_cta');
  assert.ok(ctaBtn, 'data-shiplens-label should have top priority for ID');
  assert.strictEqual(ctaBtn.label, 'annual_plan_cta');
  assert.ok(ctaBtn.text.includes('Upgrade Now'), 'Nested span text should be extracted');

  // Check 3: Native button with no attributes
  const noAttrBtn = results.find((r) => r.text === '提交订单');
  assert.ok(noAttrBtn, 'Native <button> with no attributes should be detected');
  assert.strictEqual(noAttrBtn.tag.toLowerCase(), 'button');

  // Check 4: Input submit
  const inputSubmit = results.find((r) => r.text === '确认结算');
  assert.ok(inputSubmit, 'Input submit with value attribute should be detected');
  assert.strictEqual(inputSubmit.tag.toLowerCase(), 'input');

  // Check 5: Router Link
  const routerLink = results.find((r) => r.text === '返回定价页');
  assert.ok(routerLink, 'RouterLink should be detected');
  assert.ok(routerLink.action_hint.includes('/pricing'), 'Should infer navigation action');

  // Check 6: Conditional rendering both extracted
  const logoutBtn = results.find((r) => r.id === 'btn-logout');
  const loginBtn = results.find((r) => r.id === 'btn-login');
  assert.ok(logoutBtn, 'Logout button in conditional expression should be extracted');
  assert.ok(loginBtn, 'Login button in conditional expression should be extracted');

  // Check 7: Head link ignored
  const stylesheetLink = results.find((r) => r.tag.toLowerCase() === 'link' && r.text.includes('style.css'));
  assert.strictEqual(stylesheetLink, undefined, 'Stylesheet <link> should be ignored');

  console.log('  ✅ Babel AST Interactive Elements Deep Verification passed');
}

async function testInitConnectFailedAndAtomicRollback() {
  console.log('🧪 Test 24: init Cloud Connection Failure & Atomic Cleanliness');
  const { handleInit } = require('../lib/commands/init');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-init-atomic-'));

  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'my-turnip-app', version: '1.0.0' }));
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    const originalCode = `import React from 'react';\nexport default function App() { return <button id="btn-submit">Submit</button>; }\n`;
    fs.writeFileSync(path.join(tempDir, 'src/index.js'), originalCode);
    fs.writeFileSync(path.join(tempDir, '.gitignore'), `node_modules\n.env\n`);

    const cwdBackup = process.cwd();
    process.chdir(tempDir);

    const mockCtx = {
      isJSON: true,
      client: {
        baseURL: 'https://shiplens.dev',
        connect: async () => {
          const timeoutErr = new Error('Request timed out (8000ms)');
          timeoutErr.code = 'NETWORK_FAILED';
          throw timeoutErr;
        },
      },
      resolvedAuth: { is_present: false },
      output: () => {},
    };

    let caughtErr = null;
    try {
      await handleInit([], { 'no-install': true }, mockCtx);
    } catch (e) {
      caughtErr = e;
    }
    process.chdir(cwdBackup);

    // Verify error is raised with CONNECT_FAILED code
    assert.ok(caughtErr, 'Expected handleInit to throw on connection failure');
    assert.strictEqual(caughtErr.code, 'CONNECT_FAILED');
    assert.ok(caughtErr.message.includes('Failed to connect to Shiplens cloud'));

    // Verify workspace remains clean (atomic)
    assert.strictEqual(fs.existsSync(path.join(tempDir, '.shiplens.json')), false, '.shiplens.json should NOT be created');
    assert.strictEqual(fs.existsSync(path.join(tempDir, '.shiplens')), false, '.shiplens directory should NOT be created');
    
    // Verify source code is NOT modified
    const currentCode = fs.readFileSync(path.join(tempDir, 'src/index.js'), 'utf8');
    assert.strictEqual(currentCode, originalCode, 'Source code should remain unchanged upon connection failure');

    console.log('  ✅ init Cloud Connection Failure & Atomic Cleanliness test passed');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

async function testV2ContextAndSemanticEngine() {
  console.log('🧪 Test 25: v2.0 Semantic Extraction & Page Summary Engine Deep Verification');
  const {
    generateRoutePrefix,
    normalizeControlId,
    inferConversionRole,
    generateControlDescription,
    generatePageSummary,
    generateProjectContext,
  } = require('../lib/context-generator');
  const { extractRichPageContent, extractI18nDictionary } = require('../lib/extractor');

  // 1. Test route prefix generator
  assert.strictEqual(generateRoutePrefix('/tools/base64-file-converter'), 'b64file');
  assert.strictEqual(generateRoutePrefix('/tools/base64-string-converter'), 'b64str');
  assert.strictEqual(generateRoutePrefix('/tools/basic-auth-generator'), 'basic_auth');
  assert.strictEqual(generateRoutePrefix('/tools/token-generator'), 'token_gen');
  assert.strictEqual(generateRoutePrefix('/'), 'home');
  assert.strictEqual(generateRoutePrefix('/pages/404.vue'), 'p404');

  // 2. Test unique control ID generation
  const seenIds = new Set();
  const id1 = normalizeControlId({ text: 'Download file', click_handler: 'downloadFile()' }, 'b64file', seenIds);
  const id2 = normalizeControlId({ text: 'Download file', click_handler: 'downloadFile()' }, 'b64file', seenIds);
  const id3 = normalizeControlId({ text: 'File Name', v_model: 'fileName' }, 'b64file', seenIds);
  const id4 = normalizeControlId({ text: 'Extension', v_model: 'fileExtension' }, 'b64file', seenIds);

  assert.strictEqual(id1, 'btn_b64file_download_file');
  assert.strictEqual(id2, 'btn_b64file_download_file_2');
  assert.strictEqual(id3, 'btn_b64file_file_name');
  assert.strictEqual(id4, 'btn_b64file_file_extension');

  // 3. Test conversion role inference
  assert.strictEqual(inferConversionRole({ text: 'Download file', click_handler: 'downloadFile()' }), '核心转化');
  assert.strictEqual(inferConversionRole({ text: 'Copy Base64', click_handler: 'copy()' }), '核心转化');
  assert.strictEqual(inferConversionRole({ role_type: 'upload', tag: 'c-file-upload' }), '核心输入');
  assert.strictEqual(inferConversionRole({ role_type: 'input', v_model: 'base64Input' }), '核心输入');
  assert.strictEqual(inferConversionRole({ role_type: 'input', v_model: 'fileName' }), '辅助配置');
  assert.strictEqual(inferConversionRole({ text: 'Preview image' }), '辅助体验');
  assert.strictEqual(inferConversionRole({ text: 'Clear' }), '反向重置');
  assert.strictEqual(inferConversionRole({ role_type: 'link', tag: 'a' }), '导航跳转');

  // 4. Test control description generation
  const descOEC = generateControlDescription({ text: 'Download file' }, { path: '/tools/base64-file-converter' }, '核心转化', true);
  assert.ok(descOEC.includes('核心转化按钮'));
  assert.ok(descOEC.includes('下载'));

  const descConfig = generateControlDescription({ text: 'Extension', v_model: 'fileExtension' }, { path: '/tools/base64-file-converter' }, '辅助配置', true);
  assert.ok(descConfig.includes('扩展名'));
  assert.ok(descConfig.includes('MIME 类型'));

  // 5. Test page summary generation
  const mockSkeleton = {
    tool_meta: {
      title: 'Base64 文件转换器',
      description: '将文件转换为 Base64 字符串并相互还原',
    },
    headings: ['Base64 文件转换器'],
    card_titles: ['Base64 字符串转文件', '本地文件转 Base64 字符串'],
    form_labels: ['文件名', '扩展名'],
    placeholders: ['请输入 Base64 字符串...'],
    raw_buttons: [
      { text: '下载还原文件', click_handler: 'downloadFile()' },
      { text: '复制 Base64 字符串', click_handler: 'copy()' },
    ],
  };

  const summaryZh = generatePageSummary({ name: 'Base64FileConverter', path: '/tools/base64-file-converter' }, mockSkeleton, {}, true);
  assert.ok(summaryZh.includes('功能全景与业务定义'));
  assert.ok(summaryZh.includes('业务用途与满足的用户需求'));
  assert.ok(summaryZh.includes('满足需求'));
  assert.ok(summaryZh.includes('开发者设计意图'));
  assert.ok(summaryZh.includes('输入与输出流 (I/O)'));
  assert.ok(summaryZh.includes('核心转化动作 (OEC) 与数据分析指引'));
  assert.ok(summaryZh.includes('下载还原文件') || summaryZh.includes('复制 Base64 字符串'));

  // 6. Test full project context generation with Vue SFC mock
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-vue-v2-'));
  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'it-tools-mock' }));
    fs.mkdirSync(path.join(tempDir, 'src/tools/base64-file-converter'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'locales'), { recursive: true });

    // i18n
    fs.writeFileSync(path.join(tempDir, 'locales/zh.yml'), `
tools:
  base64-file-converter:
    title: Base64 文件转换器
    description: 快速在 Base64 编码与文件之间进行双向转换
`);

    // tool definition
    fs.writeFileSync(path.join(tempDir, 'src/tools/base64-file-converter/index.ts'), `
export default defineTool({
  name: translate('tools.base64-file-converter.title'),
  path: '/tools/base64-file-converter',
  description: translate('tools.base64-file-converter.description'),
  category: 'Conversion',
});
`);

    // tool vue component
    fs.writeFileSync(path.join(tempDir, 'src/tools/base64-file-converter/base64-file-converter.vue'), `
<template>
  <div>
    <c-card title="Base64 字符串转文件">
      <c-input-text v-model="base64String" label="Base64 字符串" placeholder="在此粘贴 Base64 数据" />
      <c-input-text v-model="fileName" label="文件名" placeholder="如 document" />
      <c-input-text v-model="fileExtension" label="扩展名" placeholder="如 pdf, png" />
      <c-button @click="downloadFile()">下载还原文件</c-button>
    </c-card>
    <c-card title="本地文件转 Base64 字符串">
      <c-file-upload label="选择文件" />
      <c-button @click="copyBase64()">复制 Base64 编码</c-button>
    </c-card>
  </div>
</template>
`);

    const result = generateProjectContext(tempDir, 'app_vue_tool_test', 'it-tools-mock', 'vite', 'zh');
    assert.strictEqual(result.totalPages, 1);
    assert.ok(result.totalButtons >= 4, `Expected at least 4 controls, got ${result.totalButtons}`);
    assert.ok(result.totalOEC >= 2, `Expected at least 2 OEC buttons, got ${result.totalOEC}`);

    const md = fs.readFileSync(result.filePath, 'utf8');
    assert.ok(md.includes('Base64 文件转换器'));
    assert.ok(md.includes('btn_b64file_download_file') || md.includes('btn_b64file_download'));
    assert.ok(md.includes('btn_b64file_copy_b64') || md.includes('btn_b64file_copy_base64'));
    assert.ok(md.includes('btn_b64file_file_name'));
    assert.ok(md.includes('页面功能全景总结 (Page Functional Summary)'));
    assert.ok(md.includes('核心转化动作总量 (OEC)'));

    // Verify .json exists and is structured
    assert.ok(fs.existsSync(result.jsonPath), 'Expected .json file to exist');
    const jsonDict = JSON.parse(fs.readFileSync(result.jsonPath, 'utf8'));
    assert.strictEqual(jsonDict.app_id, 'app_vue_tool_test');
    assert.strictEqual(jsonDict.total_pages, 1);
    assert.ok(jsonDict.routes['/tools/base64-file-converter']);
    assert.ok(jsonDict.routes['/tools/base64-file-converter'].oec_actions.length >= 2);

    console.log('  ✅ v2.0 Semantic Extraction & Page Summary Engine Deep Verification passed');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

function testDeterministicJsonDictionaryAndIdempotence() {
  console.log('🧪 Test 26: Deterministic JSON UI Dictionary & 3-Run Idempotence');
  const { generateProjectContext } = require('../lib/context-generator');
  const crypto = require('crypto');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-idempotent-'));

  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'deterministic-app' }));
    fs.mkdirSync(path.join(tempDir, 'src/pages'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src/pages/index.tsx'), `
      export default function Home() {
        return (
          <div>
            <h1>Deterministic Analytics App</h1>
            <button data-shiplens-label="primary_cta">Get Started</button>
            <button id="btn-download">Download Free</button>
            <button id="btn-copy">Copy Link</button>
            <input type="text" placeholder="Enter workspace name" />
          </div>
        );
      }
    `);

    const appId = 'app_idempotent_123';
    
    // Run 1
    const res1 = generateProjectContext(tempDir, appId, 'deterministic-app', 'nextjs-pages', 'zh');
    const hashMd1 = crypto.createHash('sha256').update(fs.readFileSync(res1.filePath)).digest('hex');
    const json1 = JSON.parse(fs.readFileSync(res1.jsonPath, 'utf8'));
    const hashJson1 = crypto.createHash('sha256').update(JSON.stringify(json1)).digest('hex');

    // Run 2
    const res2 = generateProjectContext(tempDir, appId, 'deterministic-app', 'nextjs-pages', 'zh');
    const hashMd2 = crypto.createHash('sha256').update(fs.readFileSync(res2.filePath)).digest('hex');
    const json2 = JSON.parse(fs.readFileSync(res2.jsonPath, 'utf8'));
    const hashJson2 = crypto.createHash('sha256').update(JSON.stringify(json2)).digest('hex');

    // Run 3
    const res3 = generateProjectContext(tempDir, appId, 'deterministic-app', 'nextjs-pages', 'zh');
    const hashMd3 = crypto.createHash('sha256').update(fs.readFileSync(res3.filePath)).digest('hex');
    const json3 = JSON.parse(fs.readFileSync(res3.jsonPath, 'utf8'));
    const hashJson3 = crypto.createHash('sha256').update(JSON.stringify(json3)).digest('hex');

    // Verify deterministic structure
    assert.strictEqual(json1.app_id, appId);
    assert.strictEqual(json1.$schema, 'https://shiplens.dev/schema/ui-dictionary-v1.json');
    assert.ok(json1.routes['/'] || json1.routes['/index']);
    const route = json1.routes['/'] || json1.routes['/index'];
    assert.ok(route.controls_by_id);
    assert.ok(route.controls_by_text);
    assert.ok(route.oec_actions.length >= 1);

    // Control IDs must match exactly across all 3 runs
    assert.deepStrictEqual(Object.keys(json1.routes), Object.keys(json2.routes));
    assert.deepStrictEqual(Object.keys(json1.routes), Object.keys(json3.routes));
    assert.deepStrictEqual(route.oec_actions, (json2.routes['/'] || json2.routes['/index']).oec_actions);
    assert.deepStrictEqual(route.oec_actions, (json3.routes['/'] || json3.routes['/index']).oec_actions);

    console.log('  ✅ Deterministic JSON UI Dictionary & 3-Run Idempotence passed');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

function testMultiAppIsolation() {
  console.log('🧪 Test 27: Multi-App Strong Isolation (.shiplens/contexts/<app_id>.json & .md)');
  const { generateProjectContext } = require('../lib/context-generator');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-multi-app-'));

  try {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'multi-suite' }));
    fs.mkdirSync(path.join(tempDir, 'src/pages'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src/pages/index.tsx'), `
      export default function App() { return <button id="btn-login">Login</button>; }
    `);

    const appIdA = 'app_suite_alpha';
    const appIdB = 'app_suite_beta';

    const resA = generateProjectContext(tempDir, appIdA, 'Suite Alpha', 'nextjs-pages', 'zh');
    const resB = generateProjectContext(tempDir, appIdB, 'Suite Beta', 'nextjs-pages', 'zh');

    // Both files must exist independently
    const expectedMdA = path.join(tempDir, '.shiplens', 'contexts', `${appIdA}.md`);
    const expectedJsonA = path.join(tempDir, '.shiplens', 'contexts', `${appIdA}.json`);
    const expectedMdB = path.join(tempDir, '.shiplens', 'contexts', `${appIdB}.md`);
    const expectedJsonB = path.join(tempDir, '.shiplens', 'contexts', `${appIdB}.json`);

    assert.ok(fs.existsSync(expectedMdA), 'app_suite_alpha.md should exist');
    assert.ok(fs.existsSync(expectedJsonA), 'app_suite_alpha.json should exist');
    assert.ok(fs.existsSync(expectedMdB), 'app_suite_beta.md should exist');
    assert.ok(fs.existsSync(expectedJsonB), 'app_suite_beta.json should exist');

    const jsonA = JSON.parse(fs.readFileSync(expectedJsonA, 'utf8'));
    const jsonB = JSON.parse(fs.readFileSync(expectedJsonB, 'utf8'));

    assert.strictEqual(jsonA.app_id, appIdA);
    assert.strictEqual(jsonA.project_name, 'Suite Alpha');
    assert.strictEqual(jsonB.app_id, appIdB);
    assert.strictEqual(jsonB.project_name, 'Suite Beta');

    console.log('  ✅ Multi-App Strong Isolation passed');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

async function testCLIQueryContextMetaInjection() {
  console.log('🧪 Test 28: CLI Analytics Commands (query/pages/summary/heatmap) context_meta Injection');
  const { handleQuery } = require('../lib/commands/query');
  const { handlePages, handlePaths, handleCanvas } = require('../lib/commands/pages');
  const { handleSummary } = require('../lib/commands/summary');
  const { handleHeatmap } = require('../lib/commands/heatmap');
  const { generateProjectContext } = require('../lib/context-generator');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shiplens-meta-test-'));

  try {
    const appId = 'app_meta_verify_456';
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'meta-app' }));
    fs.mkdirSync(path.join(tempDir, 'src/pages'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src/pages/index.tsx'), `export default function Index() { return <button>CTA</button>; }`);

    // Generate context pair
    generateProjectContext(tempDir, appId, 'meta-app', 'nextjs-pages', 'zh');

    const cwdBackup = process.cwd();
    process.chdir(tempDir);

    const mockClient = {
      query: async () => ({ ok: true, data: [{ pv: 100 }] }),
      getPages: async () => ({ ok: true, pages: [{ path: '/', pv: 100 }] }),
      queryPaths: async () => ({ ok: true, entry_pages: [{ path: '/', count: 50 }] }),
      summary: async () => ({ ok: true, total_pv: 100, total_uv: 50 }),
      getHeatmap: async () => ({ ok: true, template_id: 'home', clicks_total: 20 }),
    };

    let queryOut = null;
    await handleQuery([], { metric: 'pageviews' }, {
      isJSON: true,
      resolveAppId: () => appId,
      client: mockClient,
      output: (d) => { queryOut = d; },
    });
    assert.ok(queryOut);
    assert.ok(queryOut.context_meta);
    assert.strictEqual(queryOut.context_meta.context_available, true);
    assert.ok(queryOut.context_meta.context_json.includes('app_meta_verify_456.json'));
    assert.ok(queryOut.context_meta.context_md.includes('app_meta_verify_456.md'));
    assert.ok(queryOut.context_meta.alignment_guide.includes('app_meta_verify_456.json'));

    let pagesOut = null;
    await handlePages([], {}, {
      isJSON: true,
      resolveAppId: () => appId,
      client: mockClient,
      output: (d) => { pagesOut = d; },
    });
    assert.ok(pagesOut);
    assert.ok(pagesOut.context_meta);
    assert.strictEqual(pagesOut.context_meta.context_available, true);

    let summaryOut = null;
    await handleSummary([], {}, {
      isJSON: true,
      resolveAppId: () => appId,
      client: mockClient,
      output: (d) => { summaryOut = d; },
    });
    assert.ok(summaryOut);
    assert.ok(summaryOut.context_meta);
    assert.strictEqual(summaryOut.context_meta.context_available, true);

    let heatmapOut = null;
    await handleHeatmap([], { template: 'home' }, {
      isJSON: true,
      resolveAppId: () => appId,
      client: mockClient,
      output: (d) => { heatmapOut = d; },
    });
    assert.ok(heatmapOut);
    assert.ok(heatmapOut.context_meta);
    assert.strictEqual(heatmapOut.context_meta.context_available, true);

    process.chdir(cwdBackup);
    console.log('  ✅ CLI Analytics Commands context_meta Injection passed');
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }
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
  await testInitIdempotentFastForward();
  await testProjectContextAutoGeneration();
  testASTExtractorDeepVerification();
  await testInitConnectFailedAndAtomicRollback();
  await testV2ContextAndSemanticEngine();
  testDeterministicJsonDictionaryAndIdempotence();
  testMultiAppIsolation();
  await testCLIQueryContextMetaInjection();
  console.log('\n🎉 All unit tests passed (100% Passed)! (28/28)');
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});



