const path = require('path');
const fs = require('fs');

let actionsCache = null;

function loadActions() {
  if (actionsCache) return actionsCache;
  const filePath = path.join(__dirname, '..', 'assets', 'actions.json');
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      actionsCache = data.actions || [];
    } else {
      actionsCache = [];
    }
  } catch (e) {
    actionsCache = [];
  }
  return actionsCache;
}

function findSimilarActions(id, allActions) {
  const normalized = (id || '').toLowerCase().replace(/[-_\s]+/g, '');
  return allActions
    .filter((a) => {
      const aNorm = a.id.toLowerCase().replace(/[-_\s]+/g, '');
      return aNorm.includes(normalized) || normalized.includes(aNorm) || a.title.toLowerCase().includes(id.toLowerCase());
    })
    .slice(0, 3)
    .map((a) => a.id);
}

async function handleAction(cmdArgs, flags, ctx) {
  const actions = loadActions();
  const rawId = flags.id || (cmdArgs[0] && cmdArgs[0] !== 'list' ? cmdArgs[0] : null);
  const isList = flags.list || cmdArgs[0] === 'list' || !rawId;

  if (isList) {
    const listData = {
      ok: true,
      total: actions.length,
      actions: actions.map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        commands: a.commands,
      })),
    };

    ctx.output(listData, () => {
      console.log(`\n📋 Shiplens Action Preset Library (${actions.length} Scenarios)\n`);
      const grouped = {};
      for (const a of actions) {
        if (!grouped[a.category]) grouped[a.category] = [];
        grouped[a.category].push(a);
      }
      for (const [cat, items] of Object.entries(grouped)) {
        console.log(`  📂 ${cat}:`);
        for (const item of items) {
          console.log(`    • ${item.id.padEnd(28)} - ${item.title}`);
        }
        console.log('');
      }
      console.log('💡 Usage: shiplens action <action_id> [--json]');
    });
    return;
  }

  const targetId = rawId.toLowerCase().trim();
  const matched = actions.find((a) => a.id.toLowerCase() === targetId);

  if (!matched) {
    const suggestions = findSimilarActions(targetId, actions);
    const err = new Error(`Action preset '${rawId}' not found.` + (suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : ''));
    err.code = 'ACTION_NOT_FOUND';
    err.suggestions = suggestions;
    throw err;
  }

  const result = {
    ok: true,
    action: matched,
  };

  ctx.output(result, () => {
    console.log(`\n🎯 [${matched.id}] ${matched.title}`);
    console.log(`📂 Category: ${matched.category}`);
    if (matched.suffix) console.log(`🏷️ Suffix: ${matched.suffix}`);
    console.log(`\n📝 Execution Steps:`);
    for (const s of matched.steps) {
      console.log(`  ${s}`);
    }
    if (matched.commands && matched.commands.length > 0) {
      console.log(`\n⚡ Prescribed CLI Commands:`);
      for (const c of matched.commands) {
        console.log(`  $ ${c}`);
      }
    }
    if (matched.foundation) {
      console.log(`\n📚 Analysis Foundation:\n  ${matched.foundation}`);
    }
    if (matched.source) {
      console.log(`\n📖 Source:\n  ${matched.source}`);
    }
    console.log('');
  });
}

module.exports = {
  handleAction,
  loadActions,
};
