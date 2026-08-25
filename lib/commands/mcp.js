const https = require('https');
const http = require('http');
const { getDeviceEnv } = require('../config');

function postMcp(url, token, body, sessionId) {
  const target = new URL(url);
  const transport = target.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const request = transport.request(target, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode || 500,
        contentType: String(response.headers['content-type'] || ''),
        sessionId: String(response.headers['mcp-session-id'] || sessionId || ''),
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('error', reject);
    request.end(body);
  });
}

function emitResponse(result) {
  const lines = result.contentType.includes('text/event-stream')
    ? result.body.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim())
    : [result.body];
  for (const line of lines) {
    if (line) process.stdout.write(`${line}\n`);
  }
}

async function handleMcp(subcommand) {
  if (subcommand !== 'serve') throw new Error('Supported mcp subcommand: serve');
  const deviceEnv = getDeviceEnv();
  if (!deviceEnv) throw new Error('shiplens.env not found. Run shiplens auth bind and complete email activation first.');
  let buffer = '';
  let sessionId = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const result = await postMcp(deviceEnv.SHIPLENS_MCP_URL, deviceEnv.SHIPLENS_MCP_TOKEN, line, sessionId);
        sessionId = result.sessionId;
        emitResponse(result);
      } catch (error) {
        process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: `Shiplens MCP proxy error: ${error.message}` }, id: null })}\n`);
      }
    }
  });
}

module.exports = { handleMcp, postMcp, emitResponse };
