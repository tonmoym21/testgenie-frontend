import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, FolderOpen, ChevronRight, Archive, Loader2, Trash2 } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
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

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const project = await api.createProject({ name: createName, description: createDesc || undefined });
      setShowCreate(false);
      setCreateName('');
      setCreateDesc('');
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this project and all its test cases?')) return;
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your test suites</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} />
          New Project
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6">
          {error}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="input"
                  placeholder="E.g. E-commerce Checkout"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="input resize-none"
                  rows={3}
                  placeholder="What is this test suite for?"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-600" />
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-20">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No projects yet</h3>
          <p className="text-gray-400 text-sm mb-6">Create your first project to get started</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} />
            New Project
          </button>
        </div>
      )}

      {/* Project list */}
      {!loading && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card p-5 flex items-center justify-between hover:border-brand-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600 group-hover:bg-brand-100 transition-colors">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">
                      {project.testCaseCount} test case{project.testCaseCount !== 1 ? 's' : ''}
                    </span>
                    {project.status === 'archived' && (
                      <span className="badge bg-gray-100 text-gray-600">
                        <Archive size={10} className="mr-1" /> Archived
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete project"
                >
                  <Trash2 size={16} />
                </button>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
