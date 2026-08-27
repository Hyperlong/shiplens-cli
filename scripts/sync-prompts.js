/**
 * Shiplens CLI — Automatic Prompt Sync & Action Catalog Compiler
 * Syncs canonical CLI prompt files and compiles actions.json before pack/publish/build.
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

function parsePrompts(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const actions = [];
  let currentCategory = '';
  let currentAction = null;
  let inCodeBlock = false;
  let blockLines = [];

  function processBlock(action, rawText) {
    const parts = rawText.split(/^---$/m).map((p) => p.trim());
    const mainPart = parts[0] || '';
    action.foundation = parts[1] ? parts[1].replace(/^(?:Analysis Foundation|分析理论基础)[:：]\s*/i, '').trim() : '';
    action.source = parts[2] ? parts[2].replace(/^(?:Sources|出处)[:：]\s*/i, '').trim() : '';

    const cmdRegex = /`(shiplens\s+[^`]+)`/g;
    const cmds = [];
    let m;
    while ((m = cmdRegex.exec(mainPart)) !== null) {
      if (!cmds.includes(m[1])) cmds.push(m[1]);
    }
    action.commands = cmds;

    const blockRows = mainPart.split(/\r?\n/);
    const stepLines = [];
    let promptText = '';
    let inSteps = false;

    for (const l of blockRows) {
      const trimmed = l.trim();
      if (/^\d+\.\s+/.test(trimmed)) {
        inSteps = true;
        stepLines.push(trimmed);
      } else if (inSteps) {
        if (/^(?:Please prioritize|请优先)/.test(trimmed)) {
          // end of steps
        } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
          if (stepLines.length > 0) {
            stepLines[stepLines.length - 1] += '\n' + trimmed;
          }
        }
      } else {
        if (trimmed) promptText += (promptText ? ' ' : '') + trimmed;
      }
    }

    action.prompt = promptText;
    action.steps = stepLines;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ') && !line.startsWith('#### ')) {
      currentCategory = line.replace('### ', '').trim();
      continue;
    }

    const headerMatch = line.match(/^####\s+\[([a-zA-Z0-9_]+)\]\s+(.*?)(?:\s+\((?:Suffix|拼接)[:：]\s*([^\)]+)\))?$/);
    if (headerMatch) {
      if (currentAction && blockLines.length > 0) {
        processBlock(currentAction, blockLines.join('\n'));
        actions.push(currentAction);
        blockLines = [];
      }
      currentAction = {
        id: headerMatch[1],
        title: headerMatch[2].trim(),
        suffix: headerMatch[3] ? headerMatch[3].trim() : '',
        category: currentCategory,
        prompt: '',
        steps: [],
        commands: [],
        foundation: '',
        source: ''
      };
      continue;
    }

    if (currentAction) {
      if (line.startsWith('```text')) {
        inCodeBlock = true;
        blockLines = [];
        continue;
      } else if (line.startsWith('```') && inCodeBlock) {
        inCodeBlock = false;
        processBlock(currentAction, blockLines.join('\n'));
        actions.push(currentAction);
        currentAction = null;
        blockLines = [];
        continue;
      }

      if (inCodeBlock) {
        blockLines.push(line);
      }
    }
  }

  if (currentAction && blockLines.length > 0) {
    processBlock(currentAction, blockLines.join('\n'));
    actions.push(currentAction);
  }

  return actions;
}

const enSourcePath = path.join(sourceDir, 'prompts_cli_en-US.md');
if (fs.existsSync(enSourcePath)) {
  const actions = parsePrompts(enSourcePath);
  const assetsDir = path.resolve(__dirname, '../lib/assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  const targetActionsJson = path.join(assetsDir, 'actions.json');
  fs.writeFileSync(targetActionsJson, JSON.stringify({ actions }, null, 2), 'utf8');
  console.log(`[sync-prompts] Compiled ${actions.length} actions -> ${targetActionsJson}`);
}

console.log('[sync-prompts] CLI prompts synchronization complete.');
