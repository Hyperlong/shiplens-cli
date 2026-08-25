async function handleHeatmap(args, flags, ctx) {
  const appId = ctx.resolveAppId();
  const templateId = flags.template || args[0];
  if (!templateId) {
    throw new Error('Specify target page template ID via --template <id>');
  }

  const env = flags.env || 'production';
  const domHash = flags['dom-hash'] || '';

  const resp = await ctx.client.getHeatmap({
    app_id: appId,
    template_id: templateId,
    env,
    dom_hash: domHash,
  });

  ctx.output(resp, () => {
    console.log(`🔥 Page Heatmap Analysis (Template: ${resp.template_id}, DOM Hash: ${resp.dom_hash || '-'}):`);
    if (resp.skeleton_svg_url) {
      console.log(`🖼️ Skeleton SVG Preview URL: ${resp.skeleton_svg_url}`);
    }
    console.log(`👆 Total Clicks: ${resp.clicks_total || 0}\n`);
    if (resp.elements && resp.elements.length > 0) {
      console.log('Top Clicked Elements:');
      resp.elements.forEach((el, i) => {
        console.log(`[${i + 1}] Element: ${el.label || '-'} (Selector: ${el.selector})`);
        console.log(`    Clicks: ${el.clicks} | Click Rate: ${((el.click_rate || 0) * 100).toFixed(2)}% | Coordinates: (${el.x_pct}, ${el.y_pct})`);
      });
    } else {
      console.log('(No click data found for this template)');
    }
  });
}

module.exports = { handleHeatmap };
