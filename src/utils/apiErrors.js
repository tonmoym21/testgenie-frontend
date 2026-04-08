// frontend/utils/apiErrors.js
// Reusable API error message extractor
// Handles: string errors, {error: {message}}, {error: "string"}, {message: "string"}

export function getApiErrorMessage(body, fallbackStatus) {
  if (!body) return `Request failed (${fallbackStatus || 'unknown'})`;

  // { error: { message: "..." } }
  if (body.error && typeof body.error === 'object' && body.error.message) {
    return body.error.message;
  }

  // { error: "string" }
  if (body.error && typeof body.error === 'string') {
    return body.error;
  }

  // { message: "string" }
  if (body.message && typeof body.message === 'string') {
    return body.message;
  }

  return `Request failed (${fallbackStatus || 'unknown'})`;
}

/**
 * Safe fetch wrapper — handles JSON error bodies even on non-ok responses
 * and file download responses that error with JSON.
 */
export async function safeFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (!res.ok) {
    let body = {};
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await res.json().catch(() => ({}));
    }
    throw new Error(getApiErrorMessage(body, res.status));
  }

  return res;
}
