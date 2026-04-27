// Stubbed Insights "views" API.
//
// Persists to localStorage so the UI is fully exercisable without a backend.
// Replace each function below with a real fetch when the server endpoints land —
// the shapes match the planned contract:
//
//   GET    /api/projects/:projectId/insight-views
//   GET    /api/projects/:projectId/insight-views/:id
//   POST   /api/projects/:projectId/insight-views
//   PATCH  /api/projects/:projectId/insight-views/:id
//   DELETE /api/projects/:projectId/insight-views/:id
//
// Layout persistence is split out because it's per-user-per-project, not
// per-view (per the spec). It also has a separate "set as org default" hook
// gated to admins.

const VIEWS_KEY = 'tf:insight-views';
const ACTIVE_KEY = 'tf:insight-active-view';
const LAYOUT_KEY = 'tf:insight-layout';
const ORG_LAYOUT_KEY = 'tf:insight-org-layout';

const DEFAULT_FILTERS = {
  dateFrom: '',
  dateTo: '',
  projectScope: 'current',
  owners: [],
  statuses: [],
  priorities: [],
  teams: [],
  tags: [],
};

const DEFAULT_VIEW_CONFIG = {
  range: '30d',
  filters: { ...DEFAULT_FILTERS },
  sort: 'recent',
  layout: null,
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota errors etc. — non-fatal in stub
  }
}

function genId() {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms = 120) {
  return new Promise((res) => setTimeout(res, ms));
}

function loadAll() {
  return readJson(VIEWS_KEY, []);
}

function saveAll(list) {
  writeJson(VIEWS_KEY, list);
}

export const viewsApi = {
  defaultFilters() {
    return { ...DEFAULT_FILTERS };
  },

  defaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_VIEW_CONFIG));
  },

  async list(projectId) {
    await delay();
    const all = loadAll();
    return all
      .filter((v) => v.projectId === projectId)
      .sort((a, b) => {
        if (a.scope !== b.scope) return a.scope === 'org' ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  },

  async create(projectId, { name, scope = 'personal', config }) {
    await delay();
    const all = loadAll();
    const view = {
      id: genId(),
      projectId,
      name: (name || 'Untitled view').trim(),
      scope,
      config: config || JSON.parse(JSON.stringify(DEFAULT_VIEW_CONFIG)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(view);
    saveAll(all);
    return view;
  },

  async update(viewId, patch) {
    await delay();
    const all = loadAll();
    const idx = all.findIndex((v) => v.id === viewId);
    if (idx === -1) throw new Error('View not found');
    all[idx] = {
      ...all[idx],
      ...patch,
      config: patch.config ? { ...all[idx].config, ...patch.config } : all[idx].config,
      updatedAt: new Date().toISOString(),
    };
    saveAll(all);
    return all[idx];
  },

  async duplicate(viewId) {
    await delay();
    const all = loadAll();
    const src = all.find((v) => v.id === viewId);
    if (!src) throw new Error('View not found');
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id: genId(),
      name: `${src.name} (copy)`,
      scope: 'personal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    all.push(copy);
    saveAll(all);
    return copy;
  },

  async remove(viewId) {
    await delay();
    const all = loadAll().filter((v) => v.id !== viewId);
    saveAll(all);
  },

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

  // Layout — per-user per-project.
  getUserLayout(projectId) {
    const map = readJson(LAYOUT_KEY, {});
    return map[projectId] || null;
  },

  setUserLayout(projectId, layout) {
    const map = readJson(LAYOUT_KEY, {});
    if (layout) map[projectId] = layout;
    else delete map[projectId];
    writeJson(LAYOUT_KEY, map);
  },

  getOrgDefaultLayout(projectId) {
    const map = readJson(ORG_LAYOUT_KEY, {});
    return map[projectId] || null;
  },

  setOrgDefaultLayout(projectId, layout) {
    const map = readJson(ORG_LAYOUT_KEY, {});
    if (layout) map[projectId] = layout;
    else delete map[projectId];
    writeJson(ORG_LAYOUT_KEY, map);
  },
};
