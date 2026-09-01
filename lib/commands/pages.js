const { getContextMeta } = require('./context');

async function handlePages(args, flags, ctx) {
  const appId = ctx.resolveAppId();
  const range = flags.range || '7d';
  const env = flags.env || 'production';
  const limit = parseInt(flags.limit || '10', 10);

  let resp = await ctx.client.getPages({ app_id: appId, range, env, limit });

  if (Array.isArray(resp)) {
    resp = { ok: true, pages: resp };
  }
  if (resp && typeof resp === 'object') {
    resp.context_meta = getContextMeta(appId);
  }

  ctx.output(resp, () => {
    console.log(`📄 Page Telemetry Evidence (Range: ${range}, Top ${limit}):\n`);
    const pages = Array.isArray(resp.pages) ? resp.pages : (Array.isArray(resp) ? resp : []);
    if (pages.length === 0) {
      console.log('(No page data found. Verify SDK reporting.)');
      return;
    }
    console.log('#   | Path / Title                       | PV      | UV      | Avg Dwell(s)');
    console.log('--- | ---------------------------------- | ------- | ------- | ------------');
    pages.forEach((p, i) => {
      const path = (p.path || p.template_id || '-').padEnd(34);
      const pv = String(p.pv || p.pageviews || 0).padEnd(7);
      const uv = String(p.uv || p.unique_visitors || 0).padEnd(7);
      const dur = String(p.avg_duration_s || p.avg_session_duration_s || 0).padEnd(12);
      console.log(`[${String(i + 1).padEnd(2)}] | ${path} | ${pv} | ${uv} | ${dur}`);
    });
  });
}

async function handlePaths(args, flags, ctx) {
  const appId = ctx.resolveAppId();
  const range = flags.range || '7d';
  const env = flags.env || 'production';

  const resp = await ctx.client.queryPaths({ app_id: appId, range, env });

  if (resp && typeof resp === 'object') {
    resp.context_meta = getContextMeta(appId);
  }

  ctx.output(resp, () => {
    console.log(`🔀 User Flow & Path Analysis (Range: ${range}):\n`);

    if (resp.entry_pages && resp.entry_pages.length > 0) {
      console.log('▶ Top Entry Pages:');
      resp.entry_pages.slice(0, 5).forEach((e, i) =>
        console.log(`  [${i + 1}] ${e.path || e.page} - ${e.sessions || e.count || 0} sessions`)
      );
    }
    if (resp.exit_pages && resp.exit_pages.length > 0) {
      console.log('\n◀ Top Exit Pages:');
      resp.exit_pages.slice(0, 5).forEach((e, i) =>
        console.log(`  [${i + 1}] ${e.path || e.page} - Exit Rate ${((e.exit_rate || 0) * 100).toFixed(1)}%`)
      );
    }
    if (resp.paths && resp.paths.length > 0) {
      console.log('\n↔ High-Frequency Paths:');
      resp.paths.slice(0, 8).forEach((p, i) =>
        console.log(`  [${i + 1}] ${p.from || p.source} → ${p.to || p.target}  (${p.count || p.sessions || 0} times)`)
      );
    } else {
      console.log(JSON.stringify(resp, null, 2));
    }
  });
}

async function handleCanvas(args, flags, ctx) {
  const appId = ctx.resolveAppId();
  const range = flags.range || '7d';
  const env = flags.env || 'production';

  const resp = await ctx.client.queryPaths({ app_id: appId, range, env, mode: 'canvas' });

  if (resp && typeof resp === 'object') {
    resp.context_meta = getContextMeta(appId);
  }

  ctx.output(resp, () => {
    console.log(`🎨 User Behavior Canvas Topology (Range: ${range}):\n`);
    const nodeCount = (resp.nodes || []).length;
    const edgeCount = (resp.edges || resp.links || []).length;
    if (nodeCount > 0 || edgeCount > 0) {
      console.log(`📍 ${nodeCount} nodes, ${edgeCount} edges`);
      if (resp.nodes && resp.nodes.length > 0) {
        console.log('\nMain Nodes:');
        resp.nodes.slice(0, 10).forEach((n, i) =>
          console.log(`  [${i + 1}] ${n.label || n.path || n.id}  (Visits: ${n.value || n.count || 0})`)
        );
      }
    } else {
      console.log(JSON.stringify(resp, null, 2));
    }
  });
}

module.exports = {
  handlePages,
  handlePaths,
  handleCanvas,
};
