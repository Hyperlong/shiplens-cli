async function handleSummary(args, flags, ctx) {
  const appId = ctx.resolveAppId();
  const range = flags.range || '7d';
  const env = flags.env || 'production';

  const resp = await ctx.client.summary(appId, range, env);

  ctx.output(resp, () => {
    console.log(`📈 Core Product Summary (Range: ${range}):`);
    console.log(`• Total Pageviews (PV): ${resp.total_pv || 0}`);
    console.log(`• Unique Visitors (UV): ${resp.total_uv || 0}`);
    console.log(`• Avg Session Duration: ${resp.avg_session_duration_s || 0} s`);
    console.log(`• Bounce Rate: ${((resp.bounce_rate || 0) * 100).toFixed(1)}%`);
    if (resp.top_countries && resp.top_countries.length > 0) {
      console.log('• Top Countries:', resp.top_countries);
    }
    if (resp.top_devices && resp.top_devices.length > 0) {
      console.log('• Top Devices:', resp.top_devices);
    }
  });
}

module.exports = { handleSummary };
