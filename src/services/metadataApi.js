// Project metadata — frontend seam.
//
// Endpoint when live:
//   GET /api/projects/:projectId/metadata
//
// Drives the filter chips on InsightsPage. Replace getMetadata() body with
// fetch when the backend lands; the response shape below is the contract.
//
// Contract:
//   {
//     owners:     [{ id, name }],
//     teams:      [{ id, name }],
//     tags:       [{ id, name }],
//     statuses:   string[],
//     priorities: string[],
//   }

const STUB_BY_PROJECT = (projectId) => ({
  owners: [
    { id: 'me',         name: 'Me' },
    { id: 'unassigned', name: 'Unassigned' },
    { id: 'u_alice',    name: 'Alice' },
    { id: 'u_bob',      name: 'Bob' },
  ],
  teams: [
    { id: 't_frontend', name: 'Frontend' },
    { id: 't_backend',  name: 'Backend' },
    { id: 't_qa',       name: 'QA' },
    { id: 't_platform', name: 'Platform' },
  ],
  tags: [
    { id: 'tag_p0',         name: 'P0' },
    { id: 'tag_regression', name: 'Regression' },
    { id: 'tag_smoke',      name: 'Smoke' },
    { id: 'tag_auth',       name: 'Auth' },
    { id: 'tag_checkout',   name: 'Checkout' },
    { id: 'tag_flaky',      name: 'Flaky' },
  ],
  statuses: ['open', 'in_progress', 'done'],
  priorities: ['P0', 'P1', 'P2', 'P3'],
  // Note: stub is the same for every project — backend will scope to the
  // requested projectId.
  _stubFor: projectId,
});

const cache = new Map();

export const metadataApi = {
  async getMetadata(projectId) {
    if (cache.has(projectId)) return cache.get(projectId);
    await new Promise((res) => setTimeout(res, 80));
    const meta = STUB_BY_PROJECT(projectId);
    cache.set(projectId, meta);
    return meta;
  },

  // Test/dev-only: clears cache so a swapped backend response is picked up.
  _invalidate(projectId) {
    if (projectId) cache.delete(projectId);
    else cache.clear();
  },
};
