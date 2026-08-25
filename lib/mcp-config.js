const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const CLIENTS = ['cursor', 'codex', 'claude', 'antigravity', 'manual'];

function makeError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getClientPath(client, homeDir = os.homedir(), platform = process.platform) {
  switch (client) {
    case 'cursor':
      return path.join(homeDir, '.cursor', 'mcp.json');
    case 'claude':
      if (platform === 'darwin') return path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      if (platform === 'win32') return path.join(homeDir, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
      return path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    case 'antigravity':
      return path.join(homeDir, '.gemini', 'config', 'mcp_config.json');
    case 'codex':
      return path.join(homeDir, '.codex', 'config.toml');
    default:
      return null;
  }
}

function getMcpServer(client, url) {
  void client;
  void url;
  return {
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['--yes', 'shiplens-cli', 'mcp', 'serve'],
  };
}

function getMcpConfig(client, url) {
  if (!CLIENTS.includes(client)) throw makeError(`Unsupported MCP client: ${client}`, 'UNSUPPORTED_MCP_CLIENT');
  return { mcpServers: { shiplens: getMcpServer(client, url) } };
}

function readJsonConfig(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('root must be object');
    return value;
  } catch (error) {
    throw makeError(`Failed to read MCP config at ${filePath}: invalid JSON`, 'INVALID_MCP_CONFIG');
  }
}

function mergeJsonMcpConfig(client, url, filePath) {
  const config = readJsonConfig(filePath);
  config.mcpServers = config.mcpServers || {};
  const desired = getMcpServer(client, url);
  const existing = config.mcpServers.shiplens;
  if (existing) {
    const matching = JSON.stringify(existing) === JSON.stringify(desired);
    return { written: false, already_configured: matching, path: filePath, config: getMcpConfig(client, url) };
  }

  config.mcpServers.shiplens = desired;
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  return { written: true, already_configured: false, path: filePath, config: getMcpConfig(client, url) };
}

function configureMcpClient(client, url, options = {}) {
  if (!CLIENTS.includes(client)) throw makeError(`Unsupported MCP client: ${client}`, 'UNSUPPORTED_MCP_CLIENT');
  if (!url) throw makeError('MCP URL is required', 'MCP_URL_REQUIRED');

  if (client === 'manual') {
    return { written: false, already_configured: false, path: null, config: getMcpConfig('manual', url) };
  }

  const homeDir = options.homeDir || os.homedir();
  const platform = options.platform || process.platform;
  const configPath = getClientPath(client, homeDir, platform);
  if (client !== 'codex') return mergeJsonMcpConfig(client, url, configPath);

  const exec = options.execFileSync || execFileSync;
  const bundledCodex = '/Applications/ChatGPT.app/Contents/Resources/codex';
  const codexCommand = options.codexCommand || process.env.SHIPLENS_CODEX_BIN || (fs.existsSync(bundledCodex) ? bundledCodex : 'codex');
  try {
    exec(codexCommand, ['mcp', 'add', 'shiplens', '--', process.platform === 'win32' ? 'npx.cmd' : 'npx', '--yes', 'shiplens-cli', 'mcp', 'serve'], { stdio: 'ignore' });
  } catch (error) {
    throw makeError('Failed to configure Codex MCP. Ensure Codex Desktop is installed and codex CLI is available in PATH.', 'CODEX_MCP_CONFIG_FAILED');
  }
  return { written: true, already_configured: false, path: configPath, config: getMcpConfig('codex', url) };
}

module.exports = { CLIENTS, getClientPath, getMcpConfig, configureMcpClient };
