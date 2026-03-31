const API_BASE = '/api';

class ApiService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
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

  async request(method, path, body = null, retry = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, options);

    // Token expired - try refresh
    if (res.status === 401 && retry && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request(method, path, body, false);
      }
      this.clearTokens();
      window.location.href = '/login';
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

  async tryRefreshToken() {
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

  // Auth
  async register(email, password) {
    return this.request('POST', '/auth/register', { email, password });
  }

  async login(email, password) {
    const data = await this.request('POST', '/auth/login', { email, password });
    this.setTokens(data.accessToken, data.refreshToken);
    return data;
  }

  async logout() {
    try {
      await this.request('POST', '/auth/logout', { refreshToken: this.refreshToken });
    } finally {
      this.clearTokens();
    }
  }

  // Projects
  async getProjects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/projects${query ? '?' + query : ''}`);
  }

  async getProject(id) {
    return this.request('GET', `/projects/${id}`);
  }

  async createProject(data) {
    return this.request('POST', '/projects', data);
  }

  async updateProject(id, data) {
    return this.request('PATCH', `/projects/${id}`, data);
  }

  async deleteProject(id) {
    return this.request('DELETE', `/projects/${id}`);
  }

  // Test Cases
  async getTestCases(projectId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/projects/${projectId}/testcases${query ? '?' + query : ''}`);
  }

  async createTestCase(projectId, data) {
    return this.request('POST', `/projects/${projectId}/testcases`, data);
  }

  async batchCreateTestCases(projectId, testCases) {
    return this.request('POST', `/projects/${projectId}/testcases/batch`, { testCases });
  }

  async updateTestCase(projectId, id, data) {
    return this.request('PATCH', `/projects/${projectId}/testcases/${id}`, data);
  }

  async deleteTestCase(projectId, id) {
    return this.request('DELETE', `/projects/${projectId}/testcases/${id}`);
  }

  // Analyze
  async analyzeTestCases(projectId, testCaseIds, analysisType) {
    return this.request('POST', `/projects/${projectId}/analyze`, {
      testCaseIds,
      analysisType,
    });
  }
}

export const api = new ApiService();
