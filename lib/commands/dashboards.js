const fs = require('fs');

async function handleDashboards(subcommand, args, flags, ctx) {
  switch (subcommand) {
    case 'list': {
      const appId = ctx.resolveAppId();
      const list = await ctx.client.listDashboards(appId);
      ctx.output({
        ok: true,
        dashboards: list,
      }, () => {
        if (!list || list.length === 0) {
          console.log('No custom dashboards found. Create one using shiplens dashboards create.');
          return;
        }
        console.log(`📊 Found ${list.length} dashboard(s):\n`);
        list.forEach((d, i) => {
          const defTag = d.is_default ? ' [Default]' : '';
          console.log(`[${i + 1}] ${d.title} (ID: ${d.dashboard_id})${defTag}`);
          if (d.url) console.log(`    URL: ${d.url}`);
          console.log('');
        });
      });
      break;
    }

    case 'create': {
      const useAI = Boolean(flags.ai);
      const title = flags.title || 'AI Telemetry Dashboard';
      const prompt = flags.prompt || '';

      if (useAI) {
        let appId = '';
        try { appId = ctx.resolveAppId(); } catch (_) {}

        if (!prompt) {
          throw new Error('Provide natural language dashboard prompt via --prompt when using --ai mode.');
        }

        const reqData = { title, prompt };
        if (appId) reqData.app_id = appId;

        const resp = await ctx.client.createAIDashboard(reqData);
        ctx.output(resp, () => {
          console.log('🎉 AI Dashboard created successfully!');
          console.log(`📌 Title: ${resp.title || title} (ID: ${resp.dashboard_id})`);
          if (resp.dashboard_url) console.log(`🔗 Dashboard URL: ${resp.dashboard_url}`);
        });
      } else {
        const appId = ctx.resolveAppId();
        const reqData = { title, prompt, app_id: appId };

        if (flags.file) {
          if (!fs.existsSync(flags.file)) {
            throw new Error(`Dashboard config file not found: ${flags.file}`);
          }
          const fileContent = JSON.parse(fs.readFileSync(flags.file, 'utf8'));
          Object.assign(reqData, fileContent);
        }

        if (!reqData.prompt && (!reqData.widgets || reqData.widgets.length === 0)) {
          throw new Error('Provide generation prompt via --prompt or configuration via --file.');
        }

        const resp = await ctx.client.createDashboard(appId, reqData);
        ctx.output(resp, () => {
          console.log('🎉 Dashboard created successfully!');
          console.log(`📌 Title: ${resp.title || reqData.title} (ID: ${resp.dashboard_id})`);
          if (resp.dashboard_url) console.log(`🔗 Dashboard URL: ${resp.dashboard_url}`);
        });
      }
      break;
    }

    default:
      throw new Error(`Unknown dashboards subcommand: ${subcommand}. Supported: list, create`);
  }
}

module.exports = { handleDashboards };
