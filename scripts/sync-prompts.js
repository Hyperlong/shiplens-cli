/**
 * Shiplens CLI — Automatic Prompt Sync Script
 * Syncs canonical CLI prompt files from the central repository before pack/publish/build.
 */
const fs = require('fs');
const path = require('path');

const candidates = [
  path.resolve(__dirname, '../../prompts'),
  path.resolve(__dirname, '../../../prompts'),
  'D:\\工作区\\Agent工作区\\shiplens\\prompts'
];

let sourceDir = null;
for (const cand of candidates) {
  if (fs.existsSync(cand) && fs.existsSync(path.join(cand, 'prompts_cli_en-US.md'))) {
    sourceDir = cand;
    break;
  }
}

if (!sourceDir) {
  console.warn('[sync-prompts] Warning: Canonical prompts directory not found. Skipping auto-sync.');
  process.exit(0);
}

const targetDir = path.resolve(__dirname, '../prompts');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const filesToSync = [
  'prompts_cli_en-US.md'
];

console.log(`[sync-prompts] Syncing CLI prompts from ${sourceDir} -> ${targetDir}...`);
for (const file of filesToSync) {
  const src = path.join(sourceDir, file);
  const dst = path.join(targetDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    const size = fs.statSync(dst).size;
    console.log(`  ✓ ${file} (${size} bytes)`);
  } else {
    console.warn(`  ✗ ${file} (source file not found at ${src})`);
  }
}
console.log('[sync-prompts] CLI prompts synchronization complete.');
