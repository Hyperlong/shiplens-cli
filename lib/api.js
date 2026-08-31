const http = require('http');
const https = require('https');
const { URL } = require('url');

const ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  APP_NOT_FOUND: 'APP_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_SQL: 'INVALID_SQL',
  PROJECT_EXISTS: 'PROJECT_EXISTS',
  INJECTION_FAILED: 'INJECTION_FAILED',
  NETWORK_FAILED: 'NETWORK_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

class APIClient {
  constructor(baseURL = 'http://120.26.230.33', secret = '') {
    this.baseURL = (baseURL || 'http://120.26.230.33').replace(/\/+$/, '');
    this.secret = secret;
  }

  async request(method, path, body = null, reqOptions = {}) {
    const fullURL = `${this.baseURL}${path}`;
    const parsed = new URL(fullURL);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    let pkgVer = '1.3.0';
    try {
      pkgVer = require('../package.json').version || pkgVer;
    } catch (e) {}
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': `Shiplens-CLI/${pkgVer} (Node.js)`,
    };
    if (this.secret) {
      headers['Authorization'] = `Bearer ${this.secret}`;
    }
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers,
      timeout: reqOptions.timeout || 15000,
    };

    return new Promise((resolve, reject) => {
      const req = lib.request(options, (res) => {
        let resData = '';
        res.on('data', (chunk) => {
          resData += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(resData);
          } catch (e) {
            json = null;
          }

          if (res.statusCode >= 400) {
            let code = ERROR_CODES.INTERNAL_ERROR;
            switch (res.statusCode) {
              case 401: code = ERROR_CODES.UNAUTHENTICATED; break;
              case 403: code = ERROR_CODES.PERMISSION_DENIED; break;
              case 404: code = ERROR_CODES.APP_NOT_FOUND; break;
              case 409: code = ERROR_CODES.PROJECT_EXISTS; break;
              case 429: code = ERROR_CODES.RATE_LIMITED; break;
              case 400: case 422: code = ERROR_CODES.INVALID_SQL; break;
            }
            const msg = (json && (json.message || json.error || (json.detail && (typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail))))) || resData || `HTTP ${res.statusCode}`;
            const err = new Error(msg);
            err.code = (json && json.code) || code;
            err.statusCode = res.statusCode;
            err.status = res.statusCode;
            err.response = json || resData;
            err.ok = false;
            return reject(err);
          }

          resolve(json !== null ? json : { ok: true });
        });
      });

      req.on('error', (err) => {
        const error = new Error(`Network connection error: ${err.message}`);
        error.code = ERROR_CODES.NETWORK_FAILED;
        error.ok = false;
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        const error = new Error(`Request timed out (${options.timeout}ms)`);
        error.code = ERROR_CODES.NETWORK_FAILED;
        error.ok = false;
        reject(error);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  // 8-second connect & project registration (POST /api/connect with proxy tolerance)
  async connect(data, reqOptions = {}) {
    const res = await this.request('POST', '/api/connect', data, { timeout: 8000, ...reqOptions });
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  // Send Magic Link for email binding (POST /api/auth/email/start)
  async startEmail(data) {
    const res = await this.request('POST', '/api/auth/email/start', data);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  // Check email activation status (GET /api/auth/email-status?token=...)
  async checkEmailStatus(token) {
    return this.request('GET', `/api/auth/email-status?token=${encodeURIComponent(token)}`);
  }

  // Exponential backoff retry for startEmail
  async startEmailWithRetry(data, retry = 2, baseMs = 500) {
    let lastErr;
    for (let i = 0; i <= retry; i++) {
      try {
        return await this.startEmail(data);
      } catch (err) {
        lastErr = err;
        if (err.status && err.status >= 400 && err.status < 500) throw err;
        if (i < retry) {
          await new Promise((r) => setTimeout(r, baseMs * Math.pow(2, i)));
        }
      }
    }
    throw lastErr;
  }

  // List offline Access Secrets (GET /api/auth/api-keys)
  async listAccessSecrets() {
    return this.request('GET', '/api/auth/api-keys');
  }

  // Create offline Access Secret (POST /api/auth/api-keys)
  async createAccessSecret(data) {
    return this.request('POST', '/api/auth/api-keys', data);
  }

  // Revoke offline Access Secret (DELETE /api/auth/api-keys/:keyId)
  async revokeAccessSecret(apiKeyId) {
    return this.request('DELETE', `/api/auth/api-keys/${encodeURIComponent(apiKeyId)}`);
  }

  async me() {
    const res = await this.request('GET', '/api/me');
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async listProjects() {
    const res = await this.request('GET', '/api/apps');
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async bindProject(appId, projectName = '') {
    return this.request('POST', '/api/projects/bind', { app_id: appId, project_name: projectName });
  }

  async updateTaxonomy(appId, data) {
    const res = await this.request('PUT', `/api/apps/${encodeURIComponent(appId)}/taxonomy`, data);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async getTaxonomy(appId) {
    const res = await this.request('GET', `/api/apps/${encodeURIComponent(appId)}/taxonomy`);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async deleteProject(appId) {
    return this.request('DELETE', `/api/apps/${encodeURIComponent(appId)}`);
  }

  async queryAnalytics(appId, queryReq) {
    const actualAppId = typeof appId === 'object' ? appId.app_id : appId;
    const actualReq = typeof appId === 'object' ? appId : queryReq;
    const res = await this.request('POST', `/api/ai/apps/${encodeURIComponent(actualAppId)}/analytics/query`, actualReq);
    if (typeof res === 'object') {
      res.ok = true;
      res.app_id = actualAppId;
    }
    return res;
  }

  async query(appId, queryReq) {
    return this.queryAnalytics(appId, queryReq);
  }

  // executeSQL (POST /api/mcp/apps/:appId/sql, payload: { sql: queryStr })
  async executeSQL(appId, queryStr) {
    const start = Date.now();
    let actualAppId = appId;
    let sql = queryStr;
    if (typeof appId === 'object') {
      actualAppId = appId.app_id;
      sql = appId.sql || appId.query;
    } else if (typeof queryStr === 'object') {
      sql = queryStr.sql || queryStr.query;
    }
    const res = await this.request('POST', `/api/mcp/apps/${encodeURIComponent(actualAppId)}/sql`, { sql });
    if (typeof res === 'object') {
      res.ok = true;
      if (!res.elapsed_ms) res.elapsed_ms = Date.now() - start;
    }
    return res;
  }

  async summary(appId, range = '7d', env = 'production') {
    const actualAppId = typeof appId === 'object' ? appId.app_id : appId;
    const actualRange = typeof appId === 'object' ? (appId.range || range) : range;
    const actualEnv = typeof appId === 'object' ? (appId.env || env) : env;
    const qs = new URLSearchParams({ range: actualRange, env: actualEnv }).toString();
    const res = await this.request('GET', `/api/ai/apps/${encodeURIComponent(actualAppId)}/summary?${qs}`);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async pages(appId, range = '7d', env = 'production', limit = 10) {
    const actualAppId = typeof appId === 'object' ? appId.app_id : appId;
    const actualRange = typeof appId === 'object' ? (appId.range || range) : range;
    const actualEnv = typeof appId === 'object' ? (appId.env || env) : env;
    const actualLimit = typeof appId === 'object' ? (appId.limit || limit) : limit;
    const qs = new URLSearchParams({ range: actualRange, env: actualEnv, limit: String(actualLimit) }).toString();
    const res = await this.request('GET', `/api/ai/apps/${encodeURIComponent(actualAppId)}/pages?${qs}`);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async getPages(data) {
    return this.pages(data);
  }

  async paths(appId, range = '7d', env = 'production') {
    const actualAppId = typeof appId === 'object' ? appId.app_id : appId;
    const actualRange = typeof appId === 'object' ? (appId.range || range) : range;
    const actualEnv = typeof appId === 'object' ? (appId.env || env) : env;
    const qs = new URLSearchParams({ range: actualRange, env: actualEnv }).toString();
    const res = await this.request('GET', `/api/ai/apps/${encodeURIComponent(actualAppId)}/paths?${qs}`);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async queryPaths(data) {
    if (data && data.mode === 'canvas') {
      return this.behaviorCanvas(data);
    }
    return this.paths(data);
  }

  async behaviorCanvas(appId, range = '7d', env = 'production') {
    const actualAppId = typeof appId === 'object' ? appId.app_id : appId;
    const actualRange = typeof appId === 'object' ? (appId.range || range) : range;
    const actualEnv = typeof appId === 'object' ? (appId.env || env) : env;
    const qs = new URLSearchParams({ range: actualRange, env: actualEnv }).toString();
    const res = await this.request('GET', `/api/ai/apps/${encodeURIComponent(actualAppId)}/behavior-canvas?${qs}`);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async heatmap(appId, templateId, env = 'production', domHash = '') {
    const actualAppId = typeof appId === 'object' ? appId.app_id : appId;
    const actualTemplateId = typeof appId === 'object' ? appId.template_id : templateId;
    const actualEnv = typeof appId === 'object' ? (appId.env || env) : env;
    const actualDomHash = typeof appId === 'object' ? (appId.dom_hash || domHash) : domHash;
    const params = { env: actualEnv };
    if (actualDomHash) params.dom_hash = actualDomHash;
    const qs = new URLSearchParams(params).toString();
    const res = await this.request('GET', `/api/ai/apps/${encodeURIComponent(actualAppId)}/pages/${encodeURIComponent(actualTemplateId)}/heatmap?${qs}`);
    if (typeof res === 'object') {
      res.ok = true;
      if (!res.template_id) res.template_id = actualTemplateId;
    }
    return res;
  }

  async getHeatmap(data) {
    return this.heatmap(data);
  }

  async listDashboards(appId) {
    const actualAppId = typeof appId === 'object' ? appId.app_id : appId;
    const res = await this.request('GET', `/api/apps/${encodeURIComponent(actualAppId)}/dashboards`);
    return Array.isArray(res) ? res : (res.dashboards || []);
  }

  async createDashboard(appId, data) {
    const actualAppId = typeof appId === 'object' ? (appId.app_id || '') : appId;
    const actualData = typeof appId === 'object' ? appId : data;
    const res = await this.request('POST', `/api/apps/${encodeURIComponent(actualAppId)}/dashboards`, actualData);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  async testConnectivity() {
    const start = Date.now();
    await this.request('GET', '/api/ai/tools');
    return Date.now() - start;
  }

  async getAnalyticsSchema(appId) {
    const actualAppId = typeof appId === 'object' ? appId.app_id : appId;
    const res = await this.request('GET', `/api/ai/apps/${encodeURIComponent(actualAppId)}/analytics/schema`);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  // Natural language AI dashboard creation (POST /api/dashboard)
  async createAIDashboard(data) {
    const res = await this.request('POST', '/api/dashboard', data);
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  // Retrieve project business context (GET /api/apps/:appId/context) - 5s timeout
  async getProjectContext(appId) {
    const res = await this.request('GET', `/api/apps/${encodeURIComponent(appId)}/context`, null, { timeout: 5000 });
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  // Upload/sync project business context (PUT /api/apps/:appId/context) - 5s timeout
  async uploadProjectContext(appId, data) {
    const res = await this.request('PUT', `/api/apps/${encodeURIComponent(appId)}/context`, data, { timeout: 5000 });
    if (typeof res === 'object') res.ok = true;
    return res;
  }

  // Delete project business context (DELETE /api/apps/:appId/context) - 5s timeout
  async deleteProjectContext(appId) {
    return this.request('DELETE', `/api/apps/${encodeURIComponent(appId)}/context`, null, { timeout: 5000 });
  }

  // Request with exponential backoff retry for general methods
  async requestWithRetry(method, path, body = null, maxRetries = 2) {
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.request(method, path, body);
      } catch (err) {
        lastErr = err;
        if (err.statusCode && err.statusCode < 500 && err.statusCode !== 429) {
          throw err;
        }
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastErr;
  }
}

module.exports = {
  APIClient,
  ERROR_CODES,
};
