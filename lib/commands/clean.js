const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { ejectSDK } = require('../injector');

async function confirmPrompt(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes');
    });
  });
}

async function handleClean(subcommand, args, flags, ctx) {
  const wd = process.cwd();
  const targetSub = subcommand || args[0] || 'all';
  const isForce = Boolean(flags.force);

  switch (targetSub) {
    case 'sdk': {
      if (!isForce && !ctx.isJSON && process.stdin.isTTY) {
        const confirmed = await confirmPrompt('Are you sure you want to remove @shiplens/sdk and revert tracking code in this project?');
        if (!confirmed) {
          return ctx.output({ ok: false, cancelled: true, message: 'Operation cancelled.' }, () => {
            console.log('Operation cancelled.');
          });
        }
      }

      const result = ejectSDK(wd);
      ctx.output({
        ok: true,
        action: 'clean_sdk',
        modified_files: result.modified_files,
        deleted_files: result.deleted_files,
        uninstall_result: result.uninstall_result,
        message: 'Successfully removed @shiplens/sdk dependency and reverted tracking code.',
      }, () => {
        console.log('Cleaned up Shiplens SDK and tracking code:');
        if (result.deleted_files.length > 0) {
          console.log(`  Deleted files: ${result.deleted_files.join(', ')}`);
        }
        if (result.modified_files.length > 0) {
          console.log(`  Reverted code in: ${result.modified_files.join(', ')}`);
        }
        console.log('  Uninstalled @shiplens/sdk package.');
      });
      break;
    }

    case 'context': {
      if (!isForce && !ctx.isJSON && process.stdin.isTTY) {
        const confirmed = await confirmPrompt('Are you sure you want to delete local business context files in .shiplens/contexts?');
        if (!confirmed) {
          return ctx.output({ ok: false, cancelled: true, message: 'Operation cancelled.' }, () => {
            console.log('Operation cancelled.');
          });
        }
      }

      const contextDir = path.join(wd, '.shiplens', 'contexts');
      const deleted = [];
      if (fs.existsSync(contextDir)) {
        try {
          const files = fs.readdirSync(contextDir);
          for (const f of files) {
            fs.unlinkSync(path.join(contextDir, f));
            deleted.push(`.shiplens/contexts/${f}`);
          }
        } catch (e) {}
      }

      ctx.output({
        ok: true,
        action: 'clean_context',
        deleted_files: deleted,
        message: `Successfully deleted ${deleted.length} business context file(s).`,
      }, () => {
        if (deleted.length > 0) {
          console.log(`Deleted business context files:\n  ${deleted.join('\n  ')}`);
        } else {
          console.log('No business context files found to delete.');
        }
      });
      break;
    }

    case 'all': {
      if (!isForce && !ctx.isJSON && process.stdin.isTTY) {
        const confirmed = await confirmPrompt('Are you sure you want to clean up all local Shiplens configurations, SDK code, and context files?');
        if (!confirmed) {
          return ctx.output({ ok: false, cancelled: true, message: 'Operation cancelled.' }, () => {
            console.log('Operation cancelled.');
          });
        }
      }

      // 1. Eject SDK
      const sdkResult = ejectSDK(wd);

      // 2. Clean contexts
      const contextDir = path.join(wd, '.shiplens', 'contexts');
      const deletedContexts = [];
      if (fs.existsSync(contextDir)) {
        try {
          const files = fs.readdirSync(contextDir);
          for (const f of files) {
            fs.unlinkSync(path.join(contextDir, f));
            deletedContexts.push(`.shiplens/contexts/${f}`);
          }
        } catch (e) {}
      }

      // 3. Clean .shiplens.json state machine
      const cfgPath = path.join(wd, '.shiplens.json');
      let configDeleted = false;
      if (fs.existsSync(cfgPath)) {
        try {
          fs.unlinkSync(cfgPath);
          configDeleted = true;
        } catch (e) {}
      }

      // 4. Clean local shiplens.env
      const envPath = path.join(wd, 'shiplens.env');
      let envDeleted = false;
      if (fs.existsSync(envPath)) {
        try {
          fs.unlinkSync(envPath);
          envDeleted = true;
        } catch (e) {}
      }

      ctx.output({
        ok: true,
        action: 'clean_all',
        sdk_ejected: sdkResult,
        deleted_contexts: deletedContexts,
        config_deleted: configDeleted,
        device_env_deleted: envDeleted,
        message: 'Successfully removed all local Shiplens files, tracking code, and configurations.',
      }, () => {
        console.log('All local Shiplens configurations and tracking code have been cleaned up:');
        console.log(`  SDK reverted: ${sdkResult.modified_files.length} file(s) modified, ${sdkResult.deleted_files.length} file(s) removed.`);
        console.log(`  Contexts: ${deletedContexts.length} file(s) removed.`);
        if (configDeleted) console.log('  Removed .shiplens.json');
        if (envDeleted) console.log('  Removed shiplens.env');
      });
      break;
    }

    default:
      throw new Error(`Unknown clean target: ${targetSub}. Supported: sdk, context, all`);
  }
}

module.exports = { handleClean };
