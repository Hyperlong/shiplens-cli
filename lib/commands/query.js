const fs = require('fs');
const { getContextMeta } = require('./context');

async function handleQuery(args, flags, ctx) {
  const appId = ctx.resolveAppId();
  const range = flags.range || '7d';
  const grain = flags.grain || 'day';
  const groupBy = flags['group-by'] || '';
  const limit = parseInt(flags.limit || '30', 10);
  const chartType = flags['chart-type'] || 'line';
  const env = flags.env || 'production';

  let queryReq;

  // Support --file: read full AnalyticsQueryRequest from JSON file
  if (flags.file) {
    if (!fs.existsSync(flags.file)) {
      const err = new Error(`Query config file not found: ${flags.file}`);
      err.code = 'INVALID_ARGS';
      throw err;
    }
    try {
      queryReq = JSON.parse(fs.readFileSync(flags.file, 'utf8'));
    } catch (e) {
      const err = new Error(`Failed to parse query config file (${flags.file}): ${e.message}`);
      err.code = 'INVALID_ARGS';
      throw err;
    }
    if (!queryReq.range) queryReq.range = range;
    if (!queryReq.env) queryReq.env = env;
  } else {
    // Support --metrics (comma-separated) or --metric
    const metricsRaw = flags.metrics || flags.metric || 'pageviews';
    const metricList = String(metricsRaw).split(',').map((m) => m.trim()).filter(Boolean);

    // Parse --filter key=val
    const filters = {};
    const filterList = Array.isArray(flags.filter)
      ? flags.filter
      : flags.filter ? [flags.filter] : [];
    for (const f of filterList) {
      const [k, ...v] = f.split('=');
      if (k && v.length > 0) filters[k.trim()] = v.join('=').trim();
    }

    queryReq = {
      env,
      range,
      panels: metricList.map((metric, idx) => ({
        panel_id: `panel_cli_${idx}`,
        title: `${metric} Trend`,
        metric,
        chart_type: chartType,
        time_grain: grain,
        group_by: groupBy || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        limit,
      })),
    };
  }

  const resp = await ctx.client.query(appId, queryReq);

  // 贯穿上下文与确定性字典指引
  if (resp && typeof resp === 'object') {
    resp.context_meta = getContextMeta(appId);
  }

  ctx.output(resp, () => {
    const metricNames = (queryReq.panels || []).map((p) => p.metric).join(', ');
    console.log(`📊 Query Metrics: ${metricNames} | Range: ${queryReq.range}`);
    if (resp.data && resp.data.length > 0) {
      resp.data.forEach((row) => console.log('•', JSON.stringify(row)));
    } else if (resp.panels && resp.panels.length > 0) {
      resp.panels.forEach((p) => {
        console.log(`\n📈 Panel: ${p.title || p.panel_id}`);
        if (Array.isArray(p.data)) {
          p.data.forEach((row) => console.log('  •', JSON.stringify(row)));
        }
      });
    } else {
      console.log('(No matching data found)');
    }
  });
}

module.exports = { handleQuery };
