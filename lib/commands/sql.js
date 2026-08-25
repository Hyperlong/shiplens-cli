async function handleSQL(args, flags, ctx) {
  const appId = ctx.resolveAppId();
  let queryStr = flags.query || flags.sql || args.join(' ');

  // Support --stdin for piped SQL execution
  if (flags.stdin || flags['read-stdin']) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const piped = Buffer.concat(chunks).toString('utf8').trim();
    if (piped) queryStr = piped;
  }

  if (!queryStr) {
    const err = new Error('SQL query string cannot be empty. Pass --query "SELECT ..." or pipe via --stdin.');
    err.code = 'INVALID_SQL';
    throw err;
  }

  const resp = await ctx.client.executeSQL({ app_id: appId, query: queryStr });

  ctx.output(resp, () => {
    const rowCount = resp.row_count !== undefined ? resp.row_count : (resp.rows ? resp.rows.length : 0);
    console.log(`🔍 SQL executed successfully (${resp.elapsed_ms || 0} ms, ${rowCount} rows returned):\n`);

    if (resp.columns && resp.columns.length > 0) {
      const colWidths = resp.columns.map((col) => {
        let maxW = col.length;
        if (resp.rows) {
          resp.rows.forEach((row) => {
            const cell = row[resp.columns.indexOf(col)];
            const cellStr = cell === null || cell === undefined ? 'NULL' : String(cell);
            if (cellStr.length > maxW) maxW = cellStr.length;
          });
        }
        return maxW;
      });

      const header = resp.columns.map((col, i) => col.padEnd(colWidths[i])).join(' | ');
      const separator = colWidths.map((w) => '-'.repeat(w)).join('-+-');
      console.log(header);
      console.log(separator);

      if (resp.rows && resp.rows.length > 0) {
        resp.rows.forEach((row) => {
          const line = resp.columns.map((_, i) => {
            const cell = row[i];
            const cellStr = cell === null || cell === undefined ? 'NULL' : String(cell);
            return cellStr.padEnd(colWidths[i]);
          }).join(' | ');
          console.log(line);
        });
      }
    } else if (resp.rows && resp.rows.length > 0) {
      resp.rows.forEach((row) => console.log(row.join('\t|\t')));
    }
  });
}

module.exports = { handleSQL };
