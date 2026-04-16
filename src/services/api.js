const API_BASE = window.location.hostname === 'localhost'
  ? '/api'
  : 'https://testgenie-backend-production.up.railway.app/api';

/** Normalize raw token values coming from localStorage — reject the string literals
 *  "undefined" / "null" / empty / whitespace that can leak in from older bugs. */
function normalizeToken(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t || t === 'undefined' || t === 'null' || t === 'NaN' || t === 'false') return null;
  return t;
}

/** Extract a user-friendly error message from any API error response body. */
function extractErrorMessage(body, status) {
  if (!body) return `Request failed (${status || 'unknown'})`;
  if (body.error && typeof body.error === 'object' && body.error.message) return body.error.message;
  if (body.error && typeof body.error === 'string') return body.error;
  if (body.message && typeof body.message === 'string') return body.message;
  return `Request failed (${status || 'unknown'})`;
}

/** Decode a JWT expiry (returns ms epoch or null). Never throws. */
function jwtExpiryMs(token) {
  const t = normalizeToken(token);
  if (!t || !t.includes('.')) return null;
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

class ApiService {
  constructor() {
    this.accessToken = normalizeToken(localStorage.getItem('accessToken'));
    this.refreshToken = normalizeToken(localStorage.getItem('refreshToken'));

    // Self-heal: wipe out any garbage values so future reads are clean.
    if (!this.accessToken) localStorage.removeItem('accessToken');
    if (!this.refreshToken) localStorage.removeItem('refreshToken');

    this._refreshPromise = null;
    this._onSessionExpired = null;
    this.API_BASE = API_BASE;
  }

  setTokens(accessToken, refreshToken) {
    const at = normalizeToken(accessToken);
    const rt = normalizeToken(refreshToken);
    if (!at || !rt) {
      // Do NOT store bad values — silently ignore. Caller should treat as failure.
      return false;
    }
    this.accessToken = at;
    this.refreshToken = rt;
    localStorage.setItem('accessToken', at);
    localStorage.setItem('refreshToken', rt);
    return true;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated() { return !!this.accessToken; }

  isAccessTokenValid() {
    const exp = jwtExpiryMs(this.accessToken);
    if (!exp) return false;
    return Date.now() < exp - 30000; // 30s skew
  }

  async ensureValidToken() {
    if (this.isAccessTokenValid()) return true;
    if (!this.refreshToken) return false;
    return this.tryRefreshToken();
  }

  /** Build Authorization header — only when we have a real JWT-shaped token. */
  _authHeader() {
    const t = normalizeToken(this.accessToken);
    if (!t || !t.includes('.')) return null;
    return `Bearer ${t}`;
  }

  async request(method, path, body = null, retry = true) {
    if (retry && !this.isAccessTokenValid() && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (!refreshed) {
        this.clearTokens();
        this._emitSessionExpired();
        const err = new Error('Session expired');
        err.code = 'SESSION_EXPIRED';
        err.status = 401;
        throw err;
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    const authHeader = this._authHeader();
    if (authHeader) headers['Authorization'] = authHeader;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, options);
    } catch (networkErr) {
      const err = new Error(`Network error: ${networkErr.message}`);
      err.code = 'NETWORK_ERROR';
      err.status = 0;
      throw err;
    }

    if (res.status === 401 && retry && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) return this.request(method, path, body, false);
      this.clearTokens();
      this._emitSessionExpired();
      const err = new Error('Session expired');
      err.code = 'SESSION_EXPIRED';
      err.status = 401;
      throw err;
    }

    // Parse body defensively — some errors (e.g. HTML from a proxy) aren't JSON
    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      // Non-JSON (HTML 502, etc.) — still try to surface something useful
      const text = await res.text().catch(() => '');
      data = text ? { error: { message: text.slice(0, 200) } } : null;
    }

    if (!res.ok) {
      const error = new Error(extractErrorMessage(data, res.status));
      error.code = data?.error?.code;
      error.status = res.status;
      error.details = data?.error?.details;
      error.body = data;
      // Preserve legacy fields used by execute endpoints
      error.preflight = data?.preflight;
      error.validation = data?.validation;
      error.readyIds = data?.readyIds;
      error.blockedIds = data?.blockedIds;
      error.readiness = data?.readiness;
      throw error;
    }

    return data;
  }

  async tryRefreshToken() {
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = this._doRefresh();
    try { return await this._refreshPromise; } finally { this._refreshPromise = null; }
  }

  async _doRefresh() {
    const rt = normalizeToken(this.refreshToken);
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => null);
      if (!data || !data.accessToken || !data.refreshToken) return false;
      return this.setTokens(data.accessToken, data.refreshToken);
    } catch { return false; }
  }

  onSessionExpired(cb) { this._onSessionExpired = cb; }
  _emitSessionExpired() { if (this._onSessionExpired) this._onSessionExpired(); }

  /**
   * Make an unauthenticated request (no Authorization header, no token refresh).
   * Use for public endpoints like invite-info and accept-invite (when logged out).
   */
  async publicRequest(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, options);
    } catch (networkErr) {
      const err = new Error(`Network error: ${networkErr.message}`);
      err.code = 'NETWORK_ERROR';
      err.status = 0;
      throw err;
    }
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json().catch(() => null)
      : null;
    if (!res.ok) {
      const error = new Error(extractErrorMessage(data, res.status));
      error.code = data?.error?.code;
      error.status = res.status;
      error.details = data?.error?.details;
      error.body = data;
      throw error;
    }
    return data;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async register(email, password) { return this.request('POST', '/auth/register', { email, password }); }
  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }
  async logout() {
    try {
      if (this.refreshToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } catch { /* ignore */ }
    finally { this.clearTokens(); }
  }

  // ── Projects ──────────────────────────────────────────────────────────────
  async getProjects(params = {}) { const q = new URLSearchParams(params).toString(); return this.request('GET', `/projects${q ? '?' + q : ''}`); }
  async getProject(id) { return this.request('GET', `/projects/${id}`); }
  async createProject(data) { return this.request('POST', '/projects', data); }
  async updateProject(id, data) { return this.request('PATCH', `/projects/${id}`, data); }
  async deleteProject(id) { return this.request('DELETE', `/projects/${id}`); }

  // ── Test Cases ────────────────────────────────────────────────────────────
  async getTestCases(projectId, params = {}) { const q = new URLSearchParams(params).toString(); return this.request('GET', `/projects/${projectId}/testcases${q ? '?' + q : ''}`); }
  async createTestCase(projectId, data) { return this.request('POST', `/projects/${projectId}/testcases`, data); }
  async batchCreateTestCases(projectId, testCases) { return this.request('POST', `/projects/${projectId}/testcases/batch`, { testCases }); }
  async updateTestCase(projectId, id, data) { return this.request('PATCH', `/projects/${projectId}/testcases/${id}`, data); }
  async deleteTestCase(projectId, id) { return this.request('DELETE', `/projects/${projectId}/testcases/${id}`); }

  // ── Analyze ───────────────────────────────────────────────────────────────
  async analyzeTestCases(projectId, testCaseIds, analysisType) {
    return this.request('POST', `/projects/${projectId}/analyze`, { testCaseIds, analysisType });
  }

  // ── Automation Assets ─────────────────────────────────────────────────────
  async createAutomationAsset(projectId, data) { return this.request('POST', `/projects/${projectId}/automation/assets`, data); }
  async listAutomationAssets(projectId, params = {}) { const q = new URLSearchParams(params).toString(); return this.request('GET', `/projects/${projectId}/automation/assets${q ? '?' + q : ''}`); }
  async getAutomationAsset(projectId, assetId) { return this.request('GET', `/projects/${projectId}/automation/assets/${assetId}`); }
  async updateAutomationAsset(projectId, assetId, data) { return this.request('PATCH', `/projects/${projectId}/automation/assets/${assetId}`, data); }
  async deleteAutomationAsset(projectId, assetId) { return this.request('DELETE', `/projects/${projectId}/automation/assets/${assetId}`); }

  // ── Readiness Verification ────────────────────────────────────────────────
  async verifyReadiness(projectId, assetId) { return this.request('POST', `/projects/${projectId}/automation/assets/${assetId}/verify-readiness`); }
  async getReadiness(projectId, assetId) { return this.request('GET', `/projects/${projectId}/automation/assets/${assetId}/readiness`); }
  async bulkVerifyReadiness(projectId, assetIds) { return this.request('POST', `/projects/${projectId}/automation/bulk-verify-readiness`, { assetIds }); }
  async getBulkReadinessSummary(projectId, assetIds) { return this.request('GET', `/projects/${projectId}/automation/bulk-readiness-summary?assetIds=${assetIds.join(',')}`); }

  // ── Execution ─────────────────────────────────────────────────────────────
  async runAutomationAsset(projectId, assetId, options = {}) { return this.request('POST', `/projects/${projectId}/automation/assets/${assetId}/run`, options); }
  async bulkRunAutomation(projectId, assetIds, options = {}) { return this.request('POST', `/projects/${projectId}/automation/bulk-run`, { assetIds, ...options }); }
  async getAutomationRuns(projectId, assetId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', `/projects/${projectId}/automation/assets/${assetId}/runs${q ? '?' + q : ''}`);
  }
  async getAutomationRunDetail(projectId, runId) { return this.request('GET', `/projects/${projectId}/automation/runs/${runId}`); }
  async getRunItems(projectId, runId) { return this.request('GET', `/projects/${projectId}/automation/runs/${runId}/items`); }
  async getRunLogs(projectId, runId) { return this.request('GET', `/projects/${projectId}/automation/runs/${runId}/logs`); }
  async getProjectExecutions(projectId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', `/projects/${projectId}/automation/executions${q ? '?' + q : ''}`);
  }
}

export const api = new ApiService();
export { extractErrorMessage, normalizeToken };
