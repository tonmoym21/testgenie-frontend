const KEY = 'tf:current-project';

export function getCurrentProjectId() {
  try {
    const v = localStorage.getItem(KEY);
    return v ? parseInt(v, 10) : null;
  } catch { return null; }
}

export function setCurrentProjectId(id) {
  try {
    if (id == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(id));
  } catch { /* ignore */ }
}
