const fs = require('fs');
const path = require('path');
const os = require('os');

const LOCAL_CONFIG_FILE = '.shiplens.json';
const GLOBAL_CONFIG_DIR = '.shiplens';
const GLOBAL_CONFIG_FILE = 'config.json';
const DEFAULT_API_URL = 'http://120.26.230.33';
const DEFAULT_ENV = 'production';
const DEVICE_ENV_FILE = 'shiplens.env';

function getDeviceEnv(dir = process.cwd()) {
  const file = path.join(dir, DEVICE_ENV_FILE);
  if (!fs.existsSync(file)) return null;
  const values = Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).filter((line) => !line.startsWith('#')).map((line) => line.split(/=(.*)/s).slice(0, 2)));
  return values.SHIPLENS_MCP_TOKEN && values.SHIPLENS_MCP_URL ? values : null;
}

function getLocalConfig(dir = process.cwd()) {
  const cfgPath = path.join(dir, LOCAL_CONFIG_FILE);
  if (fs.existsSync(cfgPath)) {
    try {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    } catch (e) {
      return null;
    }
  }
  return null;
}

function saveLocalConfig(dir = process.cwd(), cfg = {}) {
  const cfgPath = path.join(dir, LOCAL_CONFIG_FILE);
  cfg.last_synced_at = cfg.last_synced_at || new Date().toISOString();
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
}

function getGlobalConfigDir() {
  const home = os.homedir();
  const dir = path.join(home, GLOBAL_CONFIG_DIR);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
  return dir;
}

function getGlobalConfigPath() {
  return path.join(getGlobalConfigDir(), GLOBAL_CONFIG_FILE);
}

function getGlobalConfig() {
  const cfgPath = getGlobalConfigPath();
  if (fs.existsSync(cfgPath)) {
    try {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveGlobalConfig(cfg = {}) {
  const cfgPath = getGlobalConfigPath();
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
}

module.exports = {
  LOCAL_CONFIG_FILE,
  GLOBAL_CONFIG_FILE,
  DEFAULT_API_URL,
  DEFAULT_ENV,
  DEVICE_ENV_FILE,
  getDeviceEnv,
  getLocalConfig,
  saveLocalConfig,
  getGlobalConfig,
  saveGlobalConfig,
};
