import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Plus, FolderOpen, ChevronRight, Archive, Loader2, Trash2, Search, X,
  LayoutGrid, List as ListIcon
} from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState(() => localStorage.getItem('tf:proj-view') || 'grid');
  const navigate = useNavigate();

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { localStorage.setItem('tf:proj-view', view); }, [view]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const project = await api.createProject({ name: createName, description: createDesc || undefined });
      setShowCreate(false);
      setCreateName(''); setCreateDesc('');
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Delete this project and all its test cases?')) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => (p.name + ' ' + (p.description || '')).toLowerCase().includes(q));
  }, [projects, query]);

  const gradientFor = (name) => {
    const palette = [
      'from-brand-500 to-brand-700',
      'from-purple-500 to-brand-600',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-purple-600',
      'from-rose-500 to-pink-600',
      'from-indigo-500 to-brand-700',
    ];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Your workspaces for organizing and running tests.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New project
        </button>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={16} /></button>
        </div>
      )}

      {/* Toolbar */}
      {!loading && projects.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="input pl-9 py-2"
            />
          </div>
          <div className="inline-flex items-center p-1 rounded-lg bg-surface-100">
            <button
              onClick={() => setView('grid')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'grid' ? 'bg-white text-surface-800 shadow-soft' : 'text-surface-500 hover:text-surface-700'}`}
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid size={14} /> Grid
            </button>
            <button
              onClick={() => setView('list')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-white text-surface-800 shadow-soft' : 'text-surface-500 hover:text-surface-700'}`}
              aria-pressed={view === 'list'}
            >
              <ListIcon size={14} /> List
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-md shadow-soft-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">Create new project</h2>
                <p className="text-sm text-surface-500 mt-0.5">Group related test cases into a focused workspace.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="icon-btn" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="p-name" className="label">Project name</label>
                <input id="p-name" value={createName} onChange={(e) => setCreateName(e.target.value)}
                  className="input" placeholder="E.g. E-commerce Checkout" required autoFocus />
              </div>
              <div>
                <label htmlFor="p-desc" className="label">Description <span className="text-surface-400 font-normal">(optional)</span></label>
                <textarea id="p-desc" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)}
                  className="input resize-none" rows={3} placeholder="What is this test suite for?" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Create project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="skeleton w-11 h-11 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/5" />
                  <div className="skeleton h-3 w-2/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="empty">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
            <FolderOpen size={28} />
          </div>
          <h3 className="text-lg font-semibold text-surface-800 mb-1">Create your first project</h3>
          <p className="text-surface-500 text-sm mb-6 max-w-xs">Projects group your test cases, collections, and automation into a single workspace.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New project</button>
        </div>
      )}

      {/* No search results */}
      {!loading && projects.length > 0 && filtered.length === 0 && (
        <div className="empty">
          <Search size={28} className="text-surface-300 mb-3" />
          <p className="text-sm text-surface-500">No projects match "{query}"</p>
          <button onClick={() => setQuery('')} className="btn-ghost btn-sm mt-3">Clear search</button>
        </div>
      )}

      {/* Grid view */}
      {!loading && filtered.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card-interactive p-5 group relative overflow-hidden"
            >
              <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradientFor(project.name)} opacity-10 group-hover:opacity-20 transition-opacity blur-xl`} />
              <div className="relative flex items-start justify-between gap-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradientFor(project.name)} text-white flex items-center justify-center shadow-soft shrink-0`}>
                  <FolderOpen size={20} />
                </div>
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                  aria-label="Delete project"
                  title="Delete project"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <h3 className="relative font-semibold text-surface-900 mt-4 truncate">{project.name}</h3>
              {project.description && (
                <p className="relative text-sm text-surface-500 mt-1 line-clamp-2">{project.description}</p>
              )}
              <div className="relative flex items-center gap-2 mt-4 pt-4 border-t border-surface-100">
                <span className="badge-muted">
                  {project.testCaseCount} test{project.testCaseCount !== 1 ? 's' : ''}
                </span>
                {project.status === 'archived' && (
                  <span className="badge-warn"><Archive size={10} /> Archived</span>
                )}
                <ChevronRight size={16} className="ml-auto text-surface-300 group-hover:text-brand-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && filtered.length > 0 && view === 'list' && (
        <div className="card divide-y divide-surface-100 overflow-hidden">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientFor(project.name)} text-white flex items-center justify-center shrink-0`}>
                <FolderOpen size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-surface-900 truncate">{project.name}</h3>
                  {project.status === 'archived' && <span className="badge-warn"><Archive size={10} /> Archived</span>}
                </div>
                <p className="text-xs text-surface-500 mt-0.5 truncate">
                  {project.testCaseCount} test case{project.testCaseCount !== 1 ? 's' : ''}
                  {project.description && <> · {project.description}</>}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, project.id)}
                className="icon-btn opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                aria-label="Delete project"
              >
                <Trash2 size={15} />
              </button>
              <ChevronRight size={16} className="text-surface-300 group-hover:text-brand-500 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
