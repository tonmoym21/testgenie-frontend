const API_BASE = window.location.hostname === 'localhost'
  ? '/api'
  : 'https://testgenie-backend-production.up.railway.app/api';

class ApiService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
    this._refreshPromise = null;
    this._onSessionExpired = null;
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

  isAuthenticated() { return !!this.accessToken; }

  isAccessTokenValid() {
    if (!this.accessToken) return false;
    try {
      const payload = JSON.parse(atob(this.accessToken.split('.')[1]));
      return Date.now() < payload.exp * 1000 - 30000;
    } catch { return false; }
  }

  async ensureValidToken() {
    if (this.isAccessTokenValid()) return true;
    if (!this.refreshToken) return false;
    return this.tryRefreshToken();
  }

  async request(method, path, body = null, retry = true) {
    if (retry && !this.isAccessTokenValid() && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (!refreshed) { this.clearTokens(); this._emitSessionExpired(); throw new Error('Session expired'); }
    }
    const headers = { 'Content-Type': 'application/json' };
    if (this.accessToken) headers['Authorization'] = `Bearer ${this.accessToken}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${path}`, options);
    if (res.status === 401 && retry && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) return this.request(method, path, body, false);
      this.clearTokens(); this._emitSessionExpired(); throw new Error('Session expired');
    }
    if (res.status === 401 && !retry) { this.clearTokens(); this._emitSessionExpired(); throw new Error('Session expired'); }
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error?.message || 'Request failed');
      error.code = data.error?.code; error.status = res.status; error.details = data.error?.details;
      error.preflight = data.preflight; error.validation = data.validation;
      error.readyIds = data.readyIds; error.blockedIds = data.blockedIds;
      error.readiness = data.readiness;
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
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch { return false; }
  }

  onSessionExpired(cb) { this._onSessionExpired = cb; }
  _emitSessionExpired() { if (this._onSessionExpired) this._onSessionExpired(); }

  // Auth
  async register(email, password) { return this.request('POST', '/auth/register', { email, password }); }
  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }
  async logout() {
    try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: this.refreshToken }) }); }
    catch {} finally { this.clearTokens(); }
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
  async createAutomationAsset(projectId, data) { return this.request('POST', `/projects/${projectId}/automation/assets`, data); }
  async listAutomationAssets(projectId, params = {}) { const q = new URLSearchParams(params).toString(); return this.request('GET', `/projects/${projectId}/automation/assets${q ? '?' + q : ''}`); }
  async getAutomationAsset(projectId, assetId) { return this.request('GET', `/projects/${projectId}/automation/assets/${assetId}`); }
  async updateAutomationAsset(projectId, assetId, data) { return this.request('PATCH', `/projects/${projectId}/automation/assets/${assetId}`, data); }
  async deleteAutomationAsset(projectId, assetId) { return this.request('DELETE', `/projects/${projectId}/automation/assets/${assetId}`); }

  // ── Readiness Verification ─────────────────────────────────────────
  async verifyReadiness(projectId, assetId) {
    return this.request('POST', `/projects/${projectId}/automation/assets/${assetId}/verify-readiness`);
  }
  async getReadiness(projectId, assetId) {
    return this.request('GET', `/projects/${projectId}/automation/assets/${assetId}/readiness`);
  }
  async bulkVerifyReadiness(projectId, assetIds) {
    return this.request('POST', `/projects/${projectId}/automation/bulk-verify-readiness`, { assetIds });
  }
  async getBulkReadinessSummary(projectId, assetIds) {
    return this.request('GET', `/projects/${projectId}/automation/bulk-readiness-summary?assetIds=${assetIds.join(',')}`);
  }

  // ── Execution ──────────────────────────────────────────────────────
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
  async getRunItems(projectId, runId) {
    return this.request('GET', `/projects/${projectId}/automation/runs/${runId}/items`);
  }
  async getRunLogs(projectId, runId) {
    return this.request('GET', `/projects/${projectId}/automation/runs/${runId}/logs`);
  }
  async getProjectExecutions(projectId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request('GET', `/projects/${projectId}/automation/executions${q ? '?' + q : ''}`);
  }
}

export const api = new ApiService();
