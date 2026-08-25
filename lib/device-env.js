const fs = require('fs');
const path = require('path');

function saveDeviceEnv(envText, dir = process.cwd()) {
  if (!envText) return null;
  const envPath = path.join(dir, 'shiplens.env');
  fs.writeFileSync(envPath, envText, { mode: 0o600 });
  const ignorePath = path.join(dir, '.gitignore');
  const ignored = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, 'utf8') : '';
  if (!ignored.split(/\r?\n/).includes('shiplens.env')) {
    fs.appendFileSync(ignorePath, `${ignored && !ignored.endsWith('\n') ? '\n' : ''}shiplens.env\n`);
  }
  return envPath;
}

module.exports = { saveDeviceEnv };
