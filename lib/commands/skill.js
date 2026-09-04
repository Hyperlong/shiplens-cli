const fs = require('fs');
const path = require('path');
const os = require('os');

function copyDirRecursive(src, dest, force = false) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  const copiedFiles = [];

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      const subCopied = copyDirRecursive(srcPath, destPath, force);
      copiedFiles.push(...subCopied);
    } else {
      if (fs.existsSync(destPath) && !force) {
        // Skip existing without force
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
      copiedFiles.push(destPath);
    }
  }

  return copiedFiles;
}

function resolveTargetPaths(flags, args) {
  const homeDir = os.homedir();
  const isLocal = Boolean(flags.local);
  const isGlobal = Boolean(flags.global) || (!isLocal && !flags.target);
  const targetName = (flags.target || args[0] || '').toLowerCase();

  const ideDefinitions = {
    antigravity: {
      name: 'Google Antigravity / Gemini CLI',
      parentDir: path.join(homeDir, '.gemini'),
      skillDir: path.join(homeDir, '.gemini', 'config', 'skills', 'shiplens'),
    },
    cursor: {
      name: 'Cursor',
      parentDir: path.join(homeDir, '.cursor'),
      skillDir: path.join(homeDir, '.cursor', 'skills', 'shiplens'),
    },
    windsurf: {
      name: 'Windsurf',
      parentDir: path.join(homeDir, '.codeium'),
      skillDir: path.join(homeDir, '.codeium', 'windsurf', 'skills', 'shiplens'),
    },
    claude: {
      name: 'Claude Desktop / Claude Code',
      parentDir: path.join(homeDir, '.claude'),
      skillDir: path.join(homeDir, '.claude', 'skills', 'shiplens'),
    },
  };

  const selectedTargets = [];

  if (isLocal) {
    selectedTargets.push({
      id: 'local',
      name: 'Local Project Workspace (.agents)',
      skillDir: path.join(process.cwd(), '.agents', 'skills', 'shiplens'),
    });
    return selectedTargets;
  }

  if (targetName && targetName !== 'all') {
    const matched = ideDefinitions[targetName];
    if (!matched) {
      const valid = Object.keys(ideDefinitions).join(', ') + ', all';
      const err = new Error(`Unknown target IDE: '${targetName}'. Supported: ${valid}`);
      err.code = 'INVALID_TARGET';
      throw err;
    }
    selectedTargets.push({ id: targetName, ...matched });
    return selectedTargets;
  }

  if (targetName === 'all') {
    for (const [id, def] of Object.entries(ideDefinitions)) {
      selectedTargets.push({ id, ...def });
    }
    return selectedTargets;
  }

  // Auto-detect installed IDEs in --global mode
  let detectedAny = false;
  for (const [id, def] of Object.entries(ideDefinitions)) {
    if (fs.existsSync(def.parentDir)) {
      selectedTargets.push({ id, ...def });
      detectedAny = true;
    }
  }

  // If none or only antigravity detected, at least always ensure antigravity
  if (!detectedAny || !selectedTargets.some((t) => t.id === 'antigravity')) {
    selectedTargets.unshift({ id: 'antigravity', ...ideDefinitions.antigravity });
  }

  return selectedTargets;
}

async function handleSkill(subcommand, args, flags, ctx) {
  const isJSON = ctx.isJSON;

  switch (subcommand) {
    case 'install': {
      const templateDir = path.join(__dirname, '..', 'assets', 'skill-template');
      if (!fs.existsSync(templateDir)) {
        const err = new Error(`Skill template directory not found at: ${templateDir}`);
        err.code = 'TEMPLATE_NOT_FOUND';
        throw err;
      }

      const force = Boolean(flags.force);
      const targets = resolveTargetPaths(flags, args);
      const results = [];

      for (const target of targets) {
        try {
          const files = copyDirRecursive(templateDir, target.skillDir, force);
          results.push({
            id: target.id,
            name: target.name,
            skill_dir: target.skillDir,
            installed: true,
            files_count: files.length,
            skill_md: path.join(target.skillDir, 'SKILL.md'),
          });
        } catch (err) {
          results.push({
            id: target.id,
            name: target.name,
            skill_dir: target.skillDir,
            installed: false,
            error: err.message,
          });
        }
      }

      ctx.output({
        ok: true,
        action: 'install',
        global: !flags.local,
        targets: results,
      }, () => {
        console.log('\n🚀 Shiplens Agent Skill Installation Summary:\n');
        results.forEach((r, idx) => {
          if (r.installed) {
            console.log(`  [${idx + 1}] ✅ ${r.name}`);
            console.log(`      Path: ${r.skill_dir}`);
            console.log(`      Files: ${r.files_count} installed (SKILL.md, manifest, scripts, references)\n`);
          } else {
            console.log(`  [${idx + 1}] ❌ ${r.name}`);
            console.log(`      Path: ${r.skill_dir}`);
            console.log(`      Error: ${r.error}\n`);
          }
        });
        console.log('💡 Verification:');
        console.log('  Ask your AI Agent (e.g. Antigravity / Cursor): "Check website PV and bounce rate with shiplens"');
        console.log('  Agent will automatically activate the shiplens skill and query real telemetry data.\n');
      });
      break;
    }

    case 'status': {
      const targets = resolveTargetPaths(flags, args);
      const statusList = targets.map((t) => {
        const skillMd = path.join(t.skillDir, 'SKILL.md');
        const manifest = path.join(t.skillDir, 'manifest.json');
        const exists = fs.existsSync(skillMd);
        let version = null;
        if (fs.existsSync(manifest)) {
          try {
            const m = JSON.parse(fs.readFileSync(manifest, 'utf8'));
            version = m.version;
          } catch (_) {}
        }
        return {
          id: t.id,
          name: t.name,
          skill_dir: t.skillDir,
          installed: exists,
          version,
        };
      });

      ctx.output({
        ok: true,
        action: 'status',
        targets: statusList,
      }, () => {
        console.log('\n📋 Shiplens Agent Skill Status:\n');
        statusList.forEach((s, idx) => {
          const statusTag = s.installed ? `✅ Installed (v${s.version || 'unknown'})` : '⚪ Not installed';
          console.log(`  [${idx + 1}] ${statusTag} - ${s.name}`);
          console.log(`      Path: ${s.skill_dir}`);
        });
        console.log('');
      });
      break;
    }

    default:
      throw new Error(`Unknown skill subcommand: '${subcommand}'. Supported: install, status`);
  }
}

module.exports = {
  handleSkill,
  resolveTargetPaths,
};
