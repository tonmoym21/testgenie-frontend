const API_BASE = window.location.hostname === 'localhost'
  ? '/api'
  : 'https://testgenie-backend-production.up.railway.app/api';

class ApiService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this._refreshPromise = null; // mutex: only one refresh at a time
    this._onSessionExpired = null; // callback for AuthContext to hook into
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  /**
   * Check if the current access token is expired or about to expire (within 30s).
   * Returns true if token is still valid.
   */
  isAccessTokenValid() {
    if (!this.accessToken) return false;
    try {
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      const expiresAt = payload.exp * 1000; // convert to ms
      return Date.now() < expiresAt - 30000; // 30s buffer
    } catch {
      return false;
    }
  }

  /**
   * Proactively refresh the token if it's expired/expiring, before making a request.
   * Uses a mutex so concurrent calls share one refresh attempt.
   */
  async ensureValidToken() {
    if (this.isAccessTokenValid()) return true;
    if (!this.refreshToken) return false;
    return this.tryRefreshToken();
  }

  async request(method, path, body = null, retry = true) {
    // Proactively refresh before sending if token is stale
    if (retry && !this.isAccessTokenValid() && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (!refreshed) {
        this.clearTokens();
        this._emitSessionExpired();
        throw new Error('Session expired');
      }
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, options);

    // If still 401 after proactive refresh, try one more refresh (token may have been rotated by another tab)
    if (res.status === 401 && retry && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request(method, path, body, false);
      }
      this.clearTokens();
      this._emitSessionExpired();
      throw new Error('Session expired');
    }

    if (res.status === 401 && !retry) {
      this.clearTokens();
      this._emitSessionExpired();
      throw new Error('Session expired');
    }

    const data = await res.json();

    if (!res.ok) {
      const error = new Error(data.error?.message || 'Request failed');
      error.code = data.error?.code;
      error.status = res.status;
      error.details = data.error?.details;
      throw error;
    }

    return data;
  }

  /**
   * Token refresh with mutex — multiple concurrent 401s share a single refresh attempt.
   */
  async tryRefreshToken() {
    // If a refresh is already in flight, wait for it
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = this._doRefresh();
    try {
      return await this._refreshPromise;
    } finally {
      this._refreshPromise = null;
    }
  }

  async _doRefresh() {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  /** Register a callback for session expiry (used by AuthContext) */
  onSessionExpired(cb) {
    this._onSessionExpired = cb;
  }

  _emitSessionExpired() {
    if (this._onSessionExpired) {
      this._onSessionExpired();
    }
  }

  // Auth
  async register(email, password) { return this.request('POST', '/auth/register', { email, password }); }
  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }
  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
    } catch { /* ignore — best effort */ }
    finally { this.clearTokens(); }
  }

  // Projects
  async getProjects(params = {}) { const q = new URLSearchParams(params).toString(); return this.request('GET', `/projects${q ? '?' + q : ''}`); }
  async getProject(id) { return this.request('GET', `/projects/${id}`); }
  async createProject(data) { return this.request('POST', '/projects', data); }
  async updateProject(id, data) { return this.request('PATCH', `/projects/${id}`, data); }
  async deleteProject(id) { return this.request('DELETE', `/projects/${id}`); }

  // Test Cases
  async getTestCases(projectId, params = {}) { const q = new URLSearchParams(params).toString(); return this.request('GET', `/projects/${projectId}/testcases${q ? '?' + q : ''}`); }
  async createTestCase(projectId, data) { return this.request('POST', `/projects/${projectId}/testcases`, data); }
  async batchCreateTestCases(projectId, testCases) { return this.request('POST', `/projects/${projectId}/testcases/batch`, { testCases }); }
  async updateTestCase(projectId, id, data) { return this.request('PATCH', `/projects/${projectId}/testcases/${id}`, data); }
  async deleteTestCase(projectId, id) { return this.request('DELETE', `/projects/${projectId}/testcases/${id}`); }

  // Analyze
  async analyzeTestCases(projectId, testCaseIds, analysisType) {
    return this.request('POST', `/projects/${projectId}/analyze`, { testCaseIds, analysisType });
  }

  // ── Automation Assets ──────────────────────────────────────────────
  async createAutomationAsset(projectId, data) {
    return this.request('POST', `/projects/${projectId}/automation/assets`, data);
  }

  async listAutomationAssets(projectId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', `/projects/${projectId}/automation/assets${q ? '?' + q : ''}`);
  }

  async getAutomationAsset(projectId, assetId) {
    return this.request('GET', `/projects/${projectId}/automation/assets/${assetId}`);
  }

  async updateAutomationAsset(projectId, assetId, data) {
    return this.request('PATCH', `/projects/${projectId}/automation/assets/${assetId}`, data);
  }

  async deleteAutomationAsset(projectId, assetId) {
    return this.request('DELETE', `/projects/${projectId}/automation/assets/${assetId}`);
  }

  async runAutomationAsset(projectId, assetId, options = {}) {
    return this.request('POST', `/projects/${projectId}/automation/assets/${assetId}/run`, options);
  }

  async bulkRunAutomation(projectId, assetIds, options = {}) {
    return this.request('POST', `/projects/${projectId}/automation/bulk-run`, { assetIds, ...options });
  }

  async getAutomationRuns(projectId, assetId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', `/projects/${projectId}/automation/assets/${assetId}/runs${q ? '?' + q : ''}`);
  }

  async getAutomationRunDetail(projectId, runId) {
    return this.request('GET', `/projects/${projectId}/automation/runs/${runId}`);
  }
}

export const api = new ApiService();
