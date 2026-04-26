import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Plus, BookOpen, ArrowLeft, X, ChevronRight } from 'lucide-react';
import { listStories, listProjects, deleteStory } from '../services/storyApi';

const STATUS_STYLES = {
  draft: 'badge-muted',
  extracted: 'badge-info',
  reviewed: 'badge-success',
  exported: 'badge bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/15 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-400/20',
};

export default function StoriesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStories = useCallback(async () => {
    try { setLoading(true); setError(''); setStories(await listStories(projectId)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setLoading(true);
      listProjects().then((d) => { setProjects(d); setLoading(false); })
        .catch((e) => { setError(e.message); setLoading(false); });
    } else {
      loadStories();
    }
  }, [projectId, loadStories]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this story and all its scenarios?')) return;
    try {
      await deleteStory(projectId, id);
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch (err) { setError(err.message); }
  };

  if (!projectId) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Select a project</h1>
            <p className="page-subtitle">Choose a project to view its user stories.</p>
          </div>
        </div>
        {loading && <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="card p-5"><div className="skeleton h-4 w-1/3" /></div>)}</div>}
        {error && <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">{error}</div>}
        {!loading && projects.length === 0 && (
          <div className="empty">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 dark:bg-lime-500/10 dark:text-lime-400 flex items-center justify-center mb-4"><BookOpen size={24} /></div>
            <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-1">No projects found</h3>
            <button onClick={() => navigate('/projects')} className="btn-primary mt-4">Go to projects</button>
          </div>
        )}
        {!loading && projects.length > 0 && (
          <div className="card divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
            {projects.map((p) => (
              <button key={p.id} onClick={() => navigate('/projects/' + p.id + '/stories')}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors text-left group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 text-white flex items-center justify-center shrink-0"><BookOpen size={18} /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-surface-900 dark:text-surface-100 truncate">{p.name}</h3>
                  {p.description && <p className="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5">{p.description}</p>}
                </div>
                <ChevronRight size={16} className="text-surface-300 dark:text-surface-600 group-hover:text-brand-500 dark:group-hover:text-lime-400 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <Link to={'/projects/' + projectId} className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to project
      </Link>
      <div className="page-header">
        <div>
          <h1 className="page-title">User stories</h1>
          <p className="page-subtitle">Submit user stories to generate test scenarios and export CSV.</p>
        </div>
        <button onClick={() => navigate('/projects/' + projectId + '/stories/new')} className="btn-primary">
          <Plus size={16} /> New story
        </button>
      </div>

      {error && <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">{error}</div>}

      {loading && <div className="space-y-2">{[1,2].map((i) => <div key={i} className="card p-5"><div className="skeleton h-4 w-1/3 mb-2" /><div className="skeleton h-3 w-3/5" /></div>)}</div>}

      {!loading && stories.length === 0 && (
        <div className="empty">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 dark:bg-lime-500/10 dark:text-lime-400 flex items-center justify-center mb-4"><BookOpen size={24} /></div>
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-1">No stories yet</h3>
          <p className="text-surface-500 dark:text-surface-400 text-sm mb-6 max-w-xs">Create your first user story to start generating test scenarios.</p>
          <button onClick={() => navigate('/projects/' + projectId + '/stories/new')} className="btn-primary"><Plus size={16} /> Create first story</button>
        </div>
      )}

      {!loading && stories.length > 0 && (
        <div className="space-y-2">
          {stories.map((story) => (
            <div key={story.id} onClick={() => navigate('/projects/' + projectId + '/stories/' + story.id)}
              className="card card-hover p-5 cursor-pointer">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">{story.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={STATUS_STYLES[story.status] || 'badge-muted'}>{story.status}</span>
                  <button onClick={(e) => handleDelete(e, story.id)} className="icon-btn hover:text-red-500 dark:hover:text-red-400" aria-label="Delete"><X size={14} /></button>
                </div>
              </div>
              {story.description && (
                <p className="text-sm text-surface-600 dark:text-surface-300 mb-3 leading-relaxed">
                  {story.description.length > 150 ? story.description.substring(0, 150) + '…' : story.description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-surface-400 dark:text-surface-500">
                <span><span className="tabular-nums">{(story.scenario_count || 0)}</span> scenarios{story.approved_count > 0 ? ' · ' + story.approved_count + ' approved' : ''}</span>
                <span className="tabular-nums">{new Date(story.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
