const readline = require('readline');
const { getDeviceEnv } = require('../config');
const { saveDeviceEnv } = require('../device-env');
const { CLIENTS, getMcpConfig, configureMcpClient } = require('../mcp-config');
const { saveSecretToGlobal, clearGlobalSecret, maskSecret } = require('../auth');
const { APIClient } = require('../api');

async function handleAuth(subcommand, args, flags, ctx) {
  switch (subcommand) {
    case 'status': {
      const deviceEnv = getDeviceEnv();
      if (deviceEnv) {
        return ctx.output({ ok: true, authenticated: false, device_env: 'present', mcp_url: deviceEnv.SHIPLENS_MCP_URL, next: 'Use shiplens auth mcp-config, then complete OAuth in your Agent.' }, () => {
          console.log(`✅ shiplens.env detected; MCP: ${deviceEnv.SHIPLENS_MCP_URL}`);
          console.log('Complete OAuth login in your Agent before using MCP.');
        });
      }
      if (!ctx.resolvedAuth.is_present) {
        return ctx.output({
          ok: false,
          authenticated: false,
          message: 'No credentials detected. Configure via shiplens auth set.',
        }, () => {
          console.log('⚠️ No valid credentials configured. Run: shiplens auth set');
        });
      }

      try {
        const meResp = await ctx.client.me();
        ctx.output({
          ok: true,
          authenticated: true,
          source: ctx.resolvedAuth.source,
          masked_secret: ctx.resolvedAuth.masked_secret,
          user_id: meResp.user_id,
          email: meResp.email,
          last_verified_at: new Date().toISOString(),
        }, () => {
          console.log('✅ Authentication valid');
          console.log(`👤 User ID: ${meResp.user_id} | Email: ${meResp.email}`);
          console.log(`🔑 Secret Source: ${ctx.resolvedAuth.source} (${ctx.resolvedAuth.masked_secret})`);
        });
      } catch (err) {
        ctx.output({
          ok: false,
          authenticated: false,
          source: ctx.resolvedAuth.source,
          masked_secret: ctx.resolvedAuth.masked_secret,
          error: err.message,
        }, () => {
          console.log(`❌ Credential verification failed: ${err.message}`);
        });
      }
      break;
    }

    case 'mcp-config': {
      const deviceEnv = getDeviceEnv();
      if (!deviceEnv) throw new Error('shiplens.env not found. Run shiplens auth bind and complete email activation first.');
      const client = flags.client || 'manual';
      if (!CLIENTS.includes(client)) throw new Error(`Unsupported MCP client: ${client}. Supported: ${CLIENTS.join(', ')}`);
      const config = getMcpConfig(client, deviceEnv.SHIPLENS_MCP_URL);
      ctx.output({ ok: true, mcp_config: config, oauth_required: true }, () => console.log(JSON.stringify(config, null, 2)));
      break;
    }

    case 'configure': {
      const deviceEnv = getDeviceEnv();
      if (!deviceEnv) throw new Error('shiplens.env not found. Run shiplens auth bind and complete email activation first.');
      const client = flags.client || args[0];
      if (!CLIENTS.includes(client)) throw new Error(`Specify target MCP client via --client: ${CLIENTS.join(', ')}`);
      const result = configureMcpClient(client, deviceEnv.SHIPLENS_MCP_URL);
      ctx.output({ ok: true, client, oauth_required: true, ...result }, () => {
        if (client === 'manual') {
          console.log(JSON.stringify(result.config, null, 2));
          return;
        }
        console.log(result.written ? `✅ Shiplens MCP configuration written to ${client}.` : 'ℹ️ Shiplens MCP config already exists, unchanged.');
        console.log('Complete OAuth login in your Agent MCP panel.');
      });
      break;
    }

    case 'set': {
      let secret = '';
      if (flags['secret-stdin']) {
        const chunks = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        secret = Buffer.concat(chunks).toString('utf8').trim();
      } else if (args.length > 0) {
        secret = args[0].trim();
      } else if (flags.secret) {
        secret = flags.secret.trim();
      } else {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        secret = await new Promise((resolve) => {
          rl.question('Enter Shiplens Access Secret: ', (ans) => {
            rl.close();
            resolve(ans.trim());
          });
        });
      }

      if (!secret) {
        throw new Error('Access Secret cannot be empty.');
      }

      const tempClient = new APIClient(ctx.client.baseURL, secret);
      let email = '';
      let userId = '';
      try {
        const meResp = await tempClient.me();
        email = meResp.email || '';
        userId = meResp.user_id || '';
      } catch (e) {}

      saveSecretToGlobal(secret, email, userId);

      ctx.output({
        ok: true,
        masked_secret: maskSecret(secret),
        email: email || undefined,
        user_id: userId || undefined,
        message: 'Access Secret saved securely to ~/.shiplens/config.json',
      }, () => {
        console.log(`✅ Access Secret saved: ${maskSecret(secret)}`);
        if (email) console.log(`👤 Bound User: ${email} (${userId})`);
      });
      break;
    }

    case 'secret': {
      const action = args[0] || 'list';
      if (!ctx.resolvedAuth.is_present) throw new Error('Run auth set first to configure an Access Secret with administrative rights.');
      if (action === 'list') {
        const response = await ctx.client.listAccessSecrets();
        return ctx.output({ ok: true, access_secrets: response.api_keys || [] }, () => console.log(JSON.stringify(response.api_keys || [], null, 2)));
      }
      if (action === 'create') {
        const scopes = flags.scopes ? String(flags.scopes).split(',').map((scope) => scope.trim()).filter(Boolean) : undefined;
        const response = await ctx.client.createAccessSecret({ app_id: flags['app-id'], scopes, expires_at: flags.expires });
        saveSecretToGlobal(response.api_key);
        return ctx.output({ ok: true, api_key_id: response.api_key_id, api_key_preview: response.api_key_preview, app_id: response.app_id, scopes: response.scopes, expires_at: response.expires_at, saved_to_global_config: true }, () => {
          console.log(`✅ Offline Access Secret created and saved (${response.api_key_preview}).`);
        });
      }
      if (action === 'revoke') {
        const apiKeyId = flags['key-id'] || args[1];
        if (!apiKeyId) throw new Error('Provide --key-id <api_key_id>.');
        const response = await ctx.client.revokeAccessSecret(apiKeyId);
        return ctx.output({ ok: true, ...response }, () => console.log(`✅ Revoked Access Secret: ${response.api_key_id}`));
      }
      throw new Error('Supported auth secret subcommands: list, create, revoke');
    }

    case 'whoami': {
      const meResp = await ctx.client.me();
      ctx.output(meResp, () => {
        console.log(`👤 User ID: ${meResp.user_id}`);
        console.log(`📧 Email: ${meResp.email}`);
        if (meResp.project_count) {
          console.log(`📦 Projects Count: ${meResp.project_count}`);
        }
      });
      break;
    }

    case 'logout': {
      clearGlobalSecret();
      ctx.output({
        ok: true,
        message: 'Logged out successfully. Local credentials cleared.',
      }, () => {
        console.log('🚪 Logged out successfully. Local credentials cleared.');
      });
      break;
    }

    case 'bind': {
      const email = flags.email || args[0];
      if (!email || !email.includes('@')) {
        const err = new Error('Provide a valid email address, e.g.: shiplens auth bind --email you@company.com');
        err.code = 'INVALID_EMAIL';
        throw err;
      }

      const { getLocalConfig } = require('../config');
      const localCfg = getLocalConfig() || {};
      const appId = flags['app-id'] || localCfg.app_id || '';
      const projectName = localCfg.project_name || '';

      let resp;
      try {
        resp = await ctx.client.startEmailWithRetry({
          email,
          project_id: appId || undefined,
          project_name: projectName || undefined,
          client_name: 'Shiplens CLI',
          device_os: process.platform,
          device_name: require('os').hostname(),
        });
      } catch (err) {
        ctx.output({
          ok: false,
          magic_link_sent: false,
          email,
          app_id: appId || undefined,
          code: err.code || 'NETWORK_FAILED',
          message: err.message,
        }, () => {
          console.error(`❌ Failed to send email [${err.code || 'NETWORK_FAILED'}]: ${err.message}`);
        });
        process.exitCode = 1;
        return;
      }

      const envPath = saveDeviceEnv(resp.shiplens_env);

      ctx.output({
        ok: true,
        magic_link_sent: true,
        email,
        app_id: appId || undefined,
        project_name: projectName || undefined,
        shiplens_env_written: Boolean(envPath),
        message: `Activation email sent to ${email}. Click the link to complete registration.`,
      }, () => {
        console.log(`📧 Activation email sent to: ${email}`);
        if (appId) console.log(`📦 Bound App ID: ${appId}`);
        console.log('👉 Click the link in your email to activate your 50,000 monthly free events quota.');
      });
      break;
    }

    default:
      throw new Error(`Unknown auth subcommand: ${subcommand}. Supported: status, set, secret, whoami, logout, bind, mcp-config, configure`);
  }
}

module.exports = { handleAuth };
