const fs = require('fs');
const path = require('path');
const { getLocalConfig } = require('../config');
const {
  generateProjectContext,
  getContextFilePath,
  getContextJsonPath,
} = require('../context-generator');

/**
 * Extract declared app_id from Markdown header
 */
function extractAppIdFromMarkdown(content) {
  const match = content.match(/app_id[^\w\n]*[:=]\s*([a-zA-Z0-9_.\-]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Get structured context metadata for AI Agent alignment
 */
function getContextMeta(appId, dir = process.cwd()) {
  const jsonPath = getContextJsonPath(appId, null, dir);
  const mdPath = getContextFilePath(appId, null, dir);
  const relJson = path.relative(dir, jsonPath).replace(/\\/g, '/');
  const relMd = path.relative(dir, mdPath).replace(/\\/g, '/');
  const jsonExists = fs.existsSync(jsonPath);
  const mdExists = fs.existsSync(mdPath);
  return {
    context_available: jsonExists || mdExists,
    context_json: jsonExists ? relJson : undefined,
    context_md: mdExists ? relMd : undefined,
    alignment_guide: `Use ${relJson} for deterministic control ID mapping and ${relMd} for business JTBD and OEC funnel diagnosis.`,
  };
}

/**
 * Network executor with up to 2 retries and graceful fallback
 */
async function executeWithSafeFallback(fn, maxRetries = 2, baseMs = 500) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return { success: true, result: await fn() };
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseMs * attempt));
      }
    }
  }
  return { success: false, attempts: maxRetries, error: lastErr };
}

/**
 * Handle context command (generate, push, pull, show)
 */
async function handleContext(subcommand, args, flags, ctx) {
  const targetSub = subcommand || 'show';
  const appId = ctx.resolveAppId();
  const filePath = getContextFilePath(appId, flags.file);
  const localCfg = getLocalConfig() || {};
  const projectName = flags.name || localCfg.project_name || '';

  switch (targetSub) {
    case 'generate':
    case 'scan':
    case 'extract': {
      const genResult = generateProjectContext(process.cwd(), appId, projectName, flags.framework || localCfg.framework);
      ctx.output({
        ok: true,
        action: 'generate',
        app_id: appId,
        file: genResult.filePath,
        rel_file: genResult.relPath,
        json_file: genResult.jsonPath,
        rel_json_file: genResult.relJsonPath,
        pages_count: genResult.totalPages,
        buttons_count: genResult.totalButtons,
        oec_count: genResult.totalOEC,
        context_meta: getContextMeta(appId),
        message: `Project business context scanned and saved to ${genResult.relPath} and ${genResult.relJsonPath} (${genResult.totalPages} pages, ${genResult.totalButtons} controls).`,
      });
      break;
    }

    case 'push': {
      if (!fs.existsSync(filePath)) {
        const displayPath = path.relative(process.cwd(), filePath) || filePath;
        const err = new Error(`Local context file not found: ${displayPath}. Generate business context first.`);
        err.code = 'FILE_NOT_FOUND';
        throw err;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const declaredAppId = extractAppIdFromMarkdown(content);

      if (declaredAppId && declaredAppId !== appId) {
        const err = new Error(`Context file app_id (${declaredAppId}) does not match current target app_id (${appId}). Push rejected.`);
        err.code = 'PROJECT_ID_MISMATCH';
        throw err;
      }

      const syncResult = await executeWithSafeFallback(async () => {
        return ctx.client.uploadProjectContext(appId, {
          context_markdown: content,
          project_name: projectName,
        });
      }, 2, 500);

      if (!syncResult.success) {
        ctx.output({
          ok: true,
          skipped: true,
          action: 'push',
          app_id: appId,
          file: filePath,
          message: 'Server connection timed out (2 attempts). Skipped cloud sync without blocking.',
        });
        return;
      }

      ctx.output({
        ok: true,
        action: 'push',
        app_id: appId,
        file: filePath,
        bytes: Buffer.byteLength(content, 'utf8'),
        message: `Project business context (${path.relative(process.cwd(), filePath)}) synced to cloud successfully.`,
        updated_at: syncResult.result.updated_at || new Date().toISOString(),
      });
      break;
    }

    case 'pull': {
      if (fs.existsSync(filePath) && !flags.force) {
        const displayPath = path.relative(process.cwd(), filePath) || filePath;
        const err = new Error(`Local file ${displayPath} already exists. Pass --force to overwrite.`);
        err.code = 'FILE_EXISTS';
        throw err;
      }

      const pullResult = await executeWithSafeFallback(async () => {
        return ctx.client.getProjectContext(appId);
      }, 2, 500);

      if (!pullResult.success || !pullResult.result || !pullResult.result.context_markdown) {
        ctx.output({
          ok: true,
          skipped: true,
          action: 'pull',
          app_id: appId,
          message: 'Server connection timed out (2 attempts). Skipped cloud pull without blocking.',
        });
        return;
      }

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, pullResult.result.context_markdown, 'utf8');

      ctx.output({
        ok: true,
        action: 'pull',
        app_id: appId,
        file: filePath,
        bytes: Buffer.byteLength(pullResult.result.context_markdown, 'utf8'),
        message: `Business context pulled and saved to ${path.relative(process.cwd(), filePath)}.`,
        updated_at: pullResult.result.updated_at,
      });
      break;
    }

    case 'show': {
      let content = null;
      let source = 'local';

      if (!flags.cloud && fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
        source = 'local';
      } else {
        const fetchResult = await executeWithSafeFallback(async () => {
          return ctx.client.getProjectContext(appId);
        }, 2, 500);

        if (fetchResult.success && fetchResult.result && fetchResult.result.context_markdown) {
          content = fetchResult.result.context_markdown;
          source = 'cloud';
        }
      }

      if (!content) {
        const displayPath = path.relative(process.cwd(), filePath) || filePath;
        ctx.output({
          ok: true,
          app_id: appId,
          source: 'none',
          message: `No context found locally (${displayPath}) or in cloud. Server lookup skipped after timeout.`,
        });
        return;
      }

      ctx.output({
        ok: true,
        app_id: appId,
        source,
        file: source === 'local' ? filePath : null,
        context_markdown: content,
      });
      break;
    }

    default:
      throw new Error(`Unknown context subcommand: ${targetSub}. Supported: generate, push, pull, show`);
  }
}

module.exports = {
  getContextFilePath,
  getContextJsonPath,
  getContextMeta,
  handleContext,
  extractAppIdFromMarkdown,
  executeWithSafeFallback,
};
