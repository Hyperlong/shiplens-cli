const fs = require('fs');
const path = require('path');
const { getGlobalConfig, saveGlobalConfig } = require('./config');

function maskSecret(secret) {
  if (!secret || secret.length <= 8) {
    return '******';
  }
  const prefixLen = secret.length < 12 ? 3 : 7;
  const suffixLen = 4;
  if (secret.length < prefixLen + suffixLen) {
    return secret.slice(0, 3) + '...' + secret.slice(-2);
  }
  return secret.slice(0, prefixLen) + '...' + secret.slice(-suffixLen);
}

function readDotEnvSecret(dir = process.cwd()) {
  const envFiles = [path.join(dir, '.shiplens.env'), path.join(dir, '.env')];
  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      try {
        const content = fs.readFileSync(f, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const [k, ...v] = trimmed.split('=');
          const key = k.trim();
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (key === 'SHIPLENS_ACCESS_SECRET' || key === 'SHIPLENS_MCP_TOKEN') {
            return val;
          }
        }
      } catch (e) {}
    }
  }
  return '';
}

function resolveSecret(explicitSecret) {
  if (explicitSecret) {
    return {
      secret: explicitSecret,
      masked_secret: maskSecret(explicitSecret),
      source: 'flag',
      is_present: true,
    };
  }

  const envSec = process.env.SHIPLENS_ACCESS_SECRET || process.env.SHIPLENS_MCP_TOKEN;
  if (envSec) {
    return {
      secret: envSec,
      masked_secret: maskSecret(envSec),
      source: 'environment',
      is_present: true,
    };
  }

  const dotEnvSec = readDotEnvSecret();
  if (dotEnvSec) {
    return {
      secret: dotEnvSec,
      masked_secret: maskSecret(dotEnvSec),
      source: 'dotenv',
      is_present: true,
    };
  }

  const gCfg = getGlobalConfig();
  if (gCfg && gCfg.secret) {
    return {
      secret: gCfg.secret,
      masked_secret: maskSecret(gCfg.secret),
      source: 'config',
      is_present: true,
    };
  }

  return {
    secret: '',
    masked_secret: '',
    source: 'none',
    is_present: false,
  };
}

function saveSecretToGlobal(secret, email = '', userId = '') {
  const gCfg = getGlobalConfig();
  gCfg.secret = secret;
  if (email) gCfg.email = email;
  if (userId) gCfg.user_id = userId;
  saveGlobalConfig(gCfg);
}

function clearGlobalSecret() {
  const gCfg = getGlobalConfig();
  gCfg.secret = '';
  saveGlobalConfig(gCfg);
}

module.exports = {
  maskSecret,
  resolveSecret,
  saveSecretToGlobal,
  clearGlobalSecret,
};
