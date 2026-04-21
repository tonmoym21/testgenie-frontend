// frontend/services/storyApi.js
// All story API calls now go through the central api service for token refresh/mutex handling.
import { api } from './api';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://testgenie-backend-production.up.railway.app';

/**
 * Build auth headers, ensuring the token is fresh via api service.
 */
async function getHeaders() {
  await api.ensureValidToken();
  const token = api.accessToken || localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
  };
}

async function handleResponse(res) {
  if (res.status === 401) {
    // Let the api service try to refresh
    const refreshed = await api.tryRefreshToken();
    if (!refreshed) {
      api.clearTokens();
      api._emitSessionExpired();
      throw new Error('Session expired — please log in again');
    }
    // Caller should retry
    throw Object.assign(new Error('Token refreshed'), { _retry: true });
  }
  if (!res.ok) {
    const body = await res.json().catch(function() { return { error: { message: res.statusText } }; });
    throw new Error((body.error && body.error.message) || body.message || 'Request failed: ' + res.status);
  }
  return res;
}

/** Wrapper that retries once on 401 after token refresh */
async function fetchWithRetry(url, options, attempt = 0) {
  const headers = await getHeaders();
  const mergedOptions = { ...options, headers: { ...headers, ...(options.headers || {}) } };
  const res = await fetch(url, mergedOptions);
  try {
    await handleResponse(res);
    return res;
  } catch (err) {
    if (err._retry && attempt === 0) {
      return fetchWithRetry(url, options, 1);
    }
    throw err;
  }
}

export async function listProjects() {
  const res = await fetchWithRetry(API_BASE + '/api/projects', {});
  const data = await res.json();
  return data.data || data;
}

export async function listStories(projectId) {
  const res = await fetchWithRetry(API_BASE + '/api/projects/' + projectId + '/stories', {});
  return res.json();
}

export async function getStory(projectId, storyId) {
  const res = await fetchWithRetry(API_BASE + '/api/projects/' + projectId + '/stories/' + storyId, {});
  return res.json();
}

export async function createStory(projectId, data) {
  const res = await fetchWithRetry(API_BASE + '/api/projects/' + projectId + '/stories', {
    method: 'POST', body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteStory(projectId, storyId) {
  const res = await fetchWithRetry(API_BASE + '/api/projects/' + projectId + '/stories/' + storyId, {
    method: 'DELETE',
  });
  return res.json();
}

export async function listScenarios(projectId, storyId) {
  const res = await fetchWithRetry(API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/scenarios', {});
  return res.json();
}

export async function listManualTestCases(projectId, storyId) {
  const res = await fetchWithRetry(API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/manual-test-cases', {});
  return res.json();
}

export async function createManualTestCase(projectId, storyId, data) {
  const res = await fetchWithRetry(
    API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/manual-test-cases',
    { method: 'POST', body: JSON.stringify(data) }
  );
  return res.json();
}

export async function deleteManualTestCase(projectId, storyId, tcId) {
  const res = await fetchWithRetry(
    API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/manual-test-cases/' + tcId,
    { method: 'DELETE' }
  );
  return res.json();
}

export async function createScenario(projectId, storyId, data) {
  const res = await fetchWithRetry(
    API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/scenarios',
    { method: 'POST', body: JSON.stringify(data) }
  );
  return res.json();
}

export async function updateScenarioStatus(projectId, storyId, scenarioId, status, reviewNote) {
  const res = await fetchWithRetry(
    API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/scenarios/' + scenarioId,
    { method: 'PATCH', body: JSON.stringify({ status: status, reviewNote: reviewNote }) }
  );
  return res.json();
}

export async function getCoverage(projectId, storyId) {
  const res = await fetchWithRetry(API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/coverage', {});
  return res.json();
}

export async function exportStoryCsv(projectId, storyId) {
  await api.ensureValidToken();
  const token = api.accessToken || localStorage.getItem('accessToken');
  const res = await fetch(
    API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/export-csv',
    { method: 'POST', headers: { Authorization: 'Bearer ' + token } }
  );
  if (res.status === 401) {
    const refreshed = await api.tryRefreshToken();
    if (refreshed) {
      const retryToken = api.accessToken;
      const retryRes = await fetch(
        API_BASE + '/api/projects/' + projectId + '/stories/' + storyId + '/export-csv',
        { method: 'POST', headers: { Authorization: 'Bearer ' + retryToken } }
      );
      if (!retryRes.ok) {
        const body = await retryRes.json().catch(function() { return { error: { message: 'Export failed' } }; });
        throw new Error((body.error && body.error.message) || 'Export failed');
      }
      return downloadBlob(retryRes);
    }
    api.clearTokens();
    api._emitSessionExpired();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const body = await res.json().catch(function() { return { error: { message: 'Export failed' } }; });
    throw new Error((body.error && body.error.message) || 'Export failed');
  }
  return downloadBlob(res);
}

function downloadBlob(res) {
  return res.blob().then(function(blob) {
    const disposition = res.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
    const filename = filenameMatch ? filenameMatch[1] : 'story-export-' + Date.now() + '.csv';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    return { filename: filename };
  });
}
