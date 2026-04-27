// Insights "views" API — frontend seam.
//
// Shapes match the agreed backend contract exactly. The stub backend below
// is localStorage; when the real endpoints land, replace each function body
// with a fetch call (no other file changes needed) and delete the stub
// helpers + storage keys at the bottom.
//
// Endpoints when live:
//   GET    /api/projects/:projectId/views
//   POST   /api/projects/:projectId/views
//   PATCH  /api/projects/:projectId/views/:viewId
//   DELETE /api/projects/:projectId/views/:viewId
//
// Auth rules (must be enforced server-side; UI also gates):
//   - personal: only `createdBy` can mutate
//   - org: only owner/admin can mutate; all org members can read

const VIEWS_KEY = 'tf:insight-views';
const ACTIVE_KEY = 'tf:insight-active-view';

// View payload fields (mirrors contract):
//   id, name, scope ('personal'|'org'), isDefault, filters, layout, sort,
//   createdBy, updatedAt.
//
// `filters` keys: startDate, endDate, projectId, ownerIds, teamIds, tags,
// statuses, priorities.
//
// `layout` keys: visibleModules (string[]), moduleOrder (string[]).
//
// `sort` keys: field, direction.

const DEFAULT_FILTERS = {
  startDate: '',
  endDate: '',
  projectId: null,
  ownerIds: [],
  teamIds: [],
  tags: [],
  statuses: [],
  priorities: [],
};

const DEFAULT_SORT = { field: 'updatedAt', direction: 'desc' };

function defaultLayout(allModules) {
  return {
    visibleModules: [...allModules],
    moduleOrder: [...allModules],
  };
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

function genId() {
  return `view_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms = 120) { return new Promise((res) => setTimeout(res, ms)); }

function loadAll() { return readJson(VIEWS_KEY, []); }
function saveAll(list) { writeJson(VIEWS_KEY, list); }

function getCurrentUserId() {
  // Best-effort read of the AuthContext-decoded JWT subject. The real fetch
  // version drops this — `createdBy` will be filled server-side from the
  // session.
  try {
    const userRaw = localStorage.getItem('tf:user');
    if (userRaw) return JSON.parse(userRaw)?.userId || null;
  } catch { /* ignore */ }
  return null;
}

export const viewsApi = {
  defaultFilters() { return { ...DEFAULT_FILTERS }; },
  defaultSort() { return { ...DEFAULT_SORT }; },
  defaultLayout,

  async list(projectId) {
    await delay();
    const all = loadAll();
    return all
      .filter((v) => v._projectId === projectId)
      .map(stripInternal)
      .sort((a, b) => {
        if (a.scope !== b.scope) return a.scope === 'org' ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  },

  async create(projectId, { name, scope = 'personal', filters, layout, sort, isDefault = false }) {
    await delay();
    const all = loadAll();
    const userId = getCurrentUserId();
    const view = {
      id: genId(),
      _projectId: projectId,
      name: (name || 'Untitled view').trim(),
      scope,
      isDefault,
      filters: { ...DEFAULT_FILTERS, ...(filters || {}) },
      layout: layout || defaultLayout([]),
      sort: { ...DEFAULT_SORT, ...(sort || {}) },
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    };

    // Enforce single-default-per-scope semantics on the stub.
    if (isDefault) clearOtherDefaults(all, projectId, scope, view.id);

    all.push(view);
    saveAll(all);
    return stripInternal(view);
  },

  async update(viewId, patch) {
    await delay();
    const all = loadAll();
    const idx = all.findIndex((v) => v.id === viewId);
    if (idx === -1) throw new Error('View not found');

    const next = {
      ...all[idx],
      ...patch,
      // Spread-merge nested objects — patch may pass a partial filters object.
      filters: patch.filters ? { ...all[idx].filters, ...patch.filters } : all[idx].filters,
      layout:  patch.layout  ? { ...all[idx].layout,  ...patch.layout  } : all[idx].layout,
      sort:    patch.sort    ? { ...all[idx].sort,    ...patch.sort    } : all[idx].sort,
      updatedAt: new Date().toISOString(),
    };

    if (patch.isDefault === true) {
      clearOtherDefaults(all, next._projectId, next.scope, next.id);
    }

    all[idx] = next;
    saveAll(all);
    return stripInternal(next);
  },

  async duplicate(viewId, { name } = {}) {
    await delay();
    const all = loadAll();
    const src = all.find((v) => v.id === viewId);
    if (!src) throw new Error('View not found');
    const userId = getCurrentUserId();
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id: genId(),
      name: name || `${src.name} (copy)`,
      scope: 'personal',
      isDefault: false,
      createdBy: userId,
      updatedAt: new Date().toISOString(),
    };
    all.push(copy);
    saveAll(all);
    return stripInternal(copy);
  },

  async remove(viewId) {
    await delay();
    const all = loadAll().filter((v) => v.id !== viewId);
    saveAll(all);
  },

  // Active = currently-applied view in the session. Not part of contract;
  // remains client-side. Distinct from `isDefault` (boot-time choice).
  getActiveViewId(projectId) {
    const map = readJson(ACTIVE_KEY, {});
    return map[projectId] || null;
  },

  setActiveViewId(projectId, viewId) {
    const map = readJson(ACTIVE_KEY, {});
    if (viewId) map[projectId] = viewId;
    else delete map[projectId];
    writeJson(ACTIVE_KEY, map);
  },

  // Resolve the view to load on first visit:
  //   user's default personal view  ->  org default view  ->  null
  async getDefaultView(projectId, userId) {
    const list = await this.list(projectId);
    return (
      list.find((v) => v.scope === 'personal' && v.isDefault && v.createdBy === userId) ||
      list.find((v) => v.scope === 'org' && v.isDefault) ||
      null
    );
  },
};

function clearOtherDefaults(all, projectId, scope, exceptId) {
  for (const v of all) {
    if (v._projectId !== projectId) continue;
    if (v.scope !== scope) continue;
    if (v.id === exceptId) continue;
    if (v.isDefault) v.isDefault = false;
  }
}

// `_projectId` is internal bookkeeping for the stub — the real backend
// scopes by URL parameter so the wire payload doesn't carry it.
function stripInternal(v) {
  const { _projectId, ...rest } = v; // eslint-disable-line no-unused-vars
  return rest;
}
