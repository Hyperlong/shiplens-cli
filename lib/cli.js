const { APIClient } = require('./api');
const { resolveSecret } = require('./auth');
const { getLocalConfig } = require('./config');

const { handleInit } = require('./commands/init');
const { handleAuth } = require('./commands/auth');
const { handleProjects } = require('./commands/projects');
const { handleQuery } = require('./commands/query');
const { handleSQL } = require('./commands/sql');
const { handleSummary } = require('./commands/summary');
const { handlePages, handlePaths, handleCanvas } = require('./commands/pages');
const { handleHeatmap } = require('./commands/heatmap');
const { handleDashboards } = require('./commands/dashboards');
const { handleDoctor } = require('./commands/doctor');
const { handleContext } = require('./commands/context');
const { handleMcp } = require('./commands/mcp');
const { handleAction } = require('./commands/action');

let VERSION = '1.4.7';
try {
  const pkg = require('../package.json');
  if (pkg.version) VERSION = pkg.version;
} catch (e) {}

function parseArgs(argv) {
  const flags = {};
  const args = [];
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex !== -1) {
        const key = arg.slice(2, equalIndex);
        const val = arg.slice(equalIndex + 1);
        if (flags[key]) {
          if (Array.isArray(flags[key])) flags[key].push(val);
          else flags[key] = [flags[key], val];
        } else {
          flags[key] = val;
        }
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('-')) {
          if (flags[key]) {
            if (Array.isArray(flags[key])) flags[key].push(next);
            else flags[key] = [flags[key], next];
          } else {
            flags[key] = next;
          }
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      if (key === 'v') flags.version = true;
      else if (key === 'h') flags.help = true;
      else flags[key] = true;
    } else {
      args.push(arg);
    }
    i++;
  }

  return { args, flags };
}

function printHelp() {
  console.log(`Shiplens CLI - High-Speed User Telemetry & SDK Management Tool (v${VERSION})

Usage:
  shiplens <command> [subcommand] [options]
  npx.cmd --yes shiplens-cli <command> [subcommand] [options]   (Windows)
  npx --yes shiplens-cli <command> [subcommand] [options]        (macOS/Linux)

Core Commands:
  init          15-second zero-config analytics initialization & dashboard setup
  auth          Authentication & credentials (status, set, secret, whoami, logout, bind, mcp-config, configure)
  projects      Project management (list, bind, delete)
  query         Multi-dimensional metrics and conversion funnel queries
  sql           Execute secure read-only SQL queries on ClickHouse
  summary       Retrieve product overview (traffic, bounce rates, geos, devices)
  pages         Inspect page-level visits and average dwell times
  paths         Analyze user flow journeys and Sankey transition paths
  canvas        Retrieve global user behavior canvas topology
  heatmap       Retrieve click heatmaps and skeleton wireframes
  dashboards    AI dashboard management and one-click creation (list, create [--ai])
  doctor        Run full end-to-end diagnostics on SDK, credentials, and network
  context       Manage business context dictionary (generate, push, pull, show)
  action        Retrieve deterministic steps, commands, and theory for analysis actions (list, <action_id>)
  mcp serve     Run local MCP proxy server with device credentials

auth Subcommands:
  auth status                          Check credential validity
  auth set [--secret-stdin]            Save Access Secret
  auth secret list                     List Access Secrets (masked)
  auth secret create [--scopes ...]    Create scoped offline Access Secret
  auth secret revoke --key-id <id>     Revoke offline Access Secret
  auth whoami                          Display current authenticated user
  auth logout                          Clear local credentials
  auth bind --email <email> [--json]   Send Magic Link email for account binding
  auth mcp-config [--client <client>]  Print MCP configuration (cursor/codex/claude/antigravity/manual)
  auth configure --client <client>     Write MCP configuration into target client
  auth configure --client manual       Output standard MCP JSON configuration

init Dedicated Options:
  --name <string>        Project name (default: auto-read from package.json)
  --description <string> Project functional description & positioning
  --genre <id>           Level 1 category ID (e.g. utilities, finance, casual_games)
  --subgenre <id>        Level 2 subcategory ID (e.g. developer_tools, financial_tools)
  --tags <ids>           Level 4 feature tags (comma-separated tag_ids)
  --industry <string>    Compatibility industry category field
  --email <email|auto>   Auto or manual binding email

Global Options:
  --json             Output in standard JSON format (required for AI Agents)
  --force            Force overwrite existing local configuration and project ID
  --no-commit        Skip automatic Git commit after initialization
  --app-id <id>      Explicitly specify target project app_id
  --env <env>        Target environment (production / staging, default: production)
  --secret <key>     Pass Access Secret explicitly
  --api-url <url>    Custom backend API base URL (default: http://120.26.230.33)
  -v, --version      Display CLI version
  -h, --help         Display help information
`);
}

async function runCLI(argv = process.argv.slice(2)) {
  const { args, flags } = parseArgs(argv);

  if (flags.version || (args.length === 0 && flags.v)) {
    if (flags.json) {
      console.log(JSON.stringify({ ok: true, version: VERSION }));
    } else {
      console.log(`shiplens v${VERSION}`);
    }
    return;
  }

  if (flags.help || args.length === 0 || args[0] === 'help') {
    printHelp();
    return;
  }

  const isJSON = Boolean(flags.json);

  const output = (data, textFormatter) => {
    if (isJSON) {
      console.log(JSON.stringify(data, null, 2));
    } else if (textFormatter) {
      textFormatter();
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  };

  const outputError = (err) => {
    const code = err.code || 'INTERNAL_ERROR';
    if (isJSON) {
      console.log(JSON.stringify({
        ok: false,
        code,
        message: err.message,
        status: err.status,
      }, null, 2));
    } else {
      console.error(`❌ Error [${code}]: ${err.message}`);
    }
    process.exitCode = 1;
  };

  // Resolve credentials and API client
  const resolvedAuth = resolveSecret(flags.secret);
  let apiUrl = flags['api-url'] || process.env.SHIPLENS_API_URL;
  if (!apiUrl) {
    const localCfg = getLocalConfig();
    if (localCfg && localCfg.api_url) apiUrl = localCfg.api_url;
  }
  if (!apiUrl) apiUrl = 'http://120.26.230.33';

  const client = new APIClient(apiUrl, resolvedAuth.secret);

  const resolveAppId = () => {
    if (flags['app-id']) return flags['app-id'];
    const localCfg = getLocalConfig();
    if (localCfg && localCfg.app_id) return localCfg.app_id;
    const err = new Error('Target app_id not found. Provide --app-id or run inside an initialized project directory.');
    err.code = 'APP_NOT_FOUND';
    throw err;
  };

  const ctx = {
    client,
    resolvedAuth,
    resolveAppId,
    output,
    isJSON,
  };

  const command = args[0];
  const subcommand = args[1];
  const cmdArgs = args.slice(1);

  try {
    switch (command) {
      case 'init':
        await handleInit(cmdArgs, flags, ctx);
        break;
      case 'auth':
        await handleAuth(subcommand || 'status', args.slice(2), flags, ctx);
        break;
      case 'projects':
        await handleProjects(subcommand || 'list', args.slice(2), flags, ctx);
        break;
      case 'query':
        await handleQuery(cmdArgs, flags, ctx);
        break;
      case 'sql':
        await handleSQL(cmdArgs, flags, ctx);
        break;
      case 'summary':
        await handleSummary(cmdArgs, flags, ctx);
        break;
      case 'pages':
        await handlePages(cmdArgs, flags, ctx);
        break;
      case 'paths':
        await handlePaths(cmdArgs, flags, ctx);
        break;
      case 'canvas':
        await handleCanvas(cmdArgs, flags, ctx);
        break;
      case 'heatmap':
        await handleHeatmap(cmdArgs, flags, ctx);
        break;
      case 'dashboards':
        await handleDashboards(subcommand || 'list', args.slice(2), flags, ctx);
        break;
      case 'doctor':
        await handleDoctor(cmdArgs, flags, ctx);
        break;
      case 'context':
        await handleContext(subcommand || 'show', args.slice(2), flags, ctx);
        break;
      case 'action':
        await handleAction(cmdArgs, flags, ctx);
        break;
      case 'mcp':
        await handleMcp(subcommand || 'serve');
        break;
      default:
        throw new Error(`Unknown command: ${command}. Use shiplens --help to view supported commands.`);
    }
  } catch (err) {
    outputError(err);
  }
}

module.exports = {
  runCLI,
  parseArgs,
  VERSION,
};
