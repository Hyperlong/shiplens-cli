const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function handleProjects(subcommand, args, flags, ctx) {
  switch (subcommand) {
    case 'list': {
      const resp = await ctx.client.listProjects();
      ctx.output(resp, () => {
        const projects = resp.projects || [];
        if (projects.length === 0) {
          console.log('No associated projects found. Use shiplens init to create a new project.');
          return;
        }
        console.log(`📦 Found ${projects.length} project(s):\n`);
        projects.forEach((p, i) => {
          console.log(`[${i + 1}] ${p.project_name || p.app_name || 'Untitled'} (${p.app_id})`);
          if (p.description) console.log(`    Description: ${p.description}`);
          if (p.taxonomy?.subgenre?.name) {
            const tags = (p.taxonomy.feature_tags || []).map((tag) => tag.name).join(', ');
            console.log(`    Taxonomy: ${p.taxonomy.genre?.name || '-'} / ${p.taxonomy.subgenre.name}${tags ? ` - ${tags}` : ''}`);
          }
          console.log(`    Industry: ${p.industry || '-'} | Status: ${p.status || 'active'} | Schema Timestamp: ${p.schema_last_modified_at || 0}`);
          if (p.created_at) console.log(`    Created: ${p.created_at}`);
          console.log('');
        });
      });
      break;
    }

    case 'bind': {
      const appId = ctx.resolveAppId();
      const res = await ctx.client.bindProject(appId, flags.name);
      ctx.output(res, () => {
        console.log(`✅ Project ${appId} bound to current account successfully.`);
      });
      break;
    }

    case 'delete': {
      const appId = ctx.resolveAppId();
      if (!flags.force) {
        console.log(`⚠️ Warning: Deleting project ${appId} and all historical event data. This action cannot be undone!`);
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const confirmed = await new Promise((resolve) => {
          rl.question(`Enter App ID or 'yes' to confirm deletion: `, (ans) => {
            rl.close();
            resolve(ans.trim() === 'yes' || ans.trim() === appId);
          });
        });
        if (!confirmed) {
          console.log('🛑 Operation cancelled.');
          return;
        }
      }

      const res = await ctx.client.deleteProject(appId);

      // Clean up local business context file
      const localContextPath = path.join(process.cwd(), '.shiplens', 'contexts', `${appId}.md`);
      if (fs.existsSync(localContextPath)) {
        try { fs.unlinkSync(localContextPath); } catch {}
      }

      ctx.output(res, () => {
        console.log(`🗑️ Project ${appId} deleted successfully.`);
      });
      break;
    }

    case 'update':
    case 'edit': {
      const appId = ctx.resolveAppId();
      const { resolveTaxonomyFromIDs } = require('../taxonomy');
      const { getLocalConfig, saveLocalConfig } = require('../config');
      const wd = process.cwd();
      const localCfg = getLocalConfig(wd) || {};

      const projectName = flags.name || flags['project-name'] || localCfg.project_name;
      const description = flags.description !== undefined ? flags.description : localCfg.description;

      let taxonomy = null;
      if (flags.genre || flags.subgenre || flags.tags) {
        const rawTags = flags.tags ? (Array.isArray(flags.tags) ? flags.tags : flags.tags.split(',').map((t) => t.trim())) : (localCfg.feature_tags || []);
        taxonomy = resolveTaxonomyFromIDs(flags.genre || localCfg.genre_id, flags.subgenre || localCfg.subgenre_id, rawTags);
      }

      const payload = {
        project_name: projectName,
        description: description,
        genre_id: taxonomy ? taxonomy.genre.id : (flags.genre || localCfg.genre_id),
        subgenre_id: taxonomy ? taxonomy.subgenre.id : (flags.subgenre || localCfg.subgenre_id),
        feature_tags: taxonomy ? taxonomy.feature_tag_ids.join(',') : (flags.tags || (localCfg.feature_tags ? localCfg.feature_tags.join(',') : '')),
        industry: flags.industry || (taxonomy ? taxonomy.subgenre.id : localCfg.industry),
      };

      const res = await ctx.client.updateTaxonomy(appId, payload);

      if (localCfg.app_id === appId) {
        saveLocalConfig(wd, {
          ...localCfg,
          project_name: projectName || localCfg.project_name,
          description: description !== undefined ? description : localCfg.description,
          genre_id: payload.genre_id || localCfg.genre_id,
          subgenre_id: payload.subgenre_id || localCfg.subgenre_id,
          feature_tags: taxonomy ? taxonomy.feature_tag_ids : localCfg.feature_tags,
          industry: payload.industry || localCfg.industry,
          last_synced_at: new Date().toISOString(),
        });
      }

      ctx.output({
        ok: true,
        app_id: appId,
        project_name: projectName,
        description,
        taxonomy: taxonomy || undefined,
        message: `Project ${appId} metadata updated successfully.`,
      }, () => {
        console.log(`✅ Project ${appId} updated successfully.`);
        if (projectName) console.log(`   Name: ${projectName}`);
        if (description) console.log(`   Description: ${description}`);
      });
      break;
    }

    default:
      throw new Error(`Unknown projects subcommand: ${subcommand}. Supported: list, update, bind, delete`);
  }
}

module.exports = { handleProjects };

