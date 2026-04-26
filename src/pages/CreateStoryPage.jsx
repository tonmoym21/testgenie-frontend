import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createStory } from '../services/storyApi';

export default function CreateStoryPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState('text');
  const [sourceUrl, setSourceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required');
    if (description.trim().length < 20) return setError('Description must be at least 20 characters');
    try {
      setSubmitting(true); setError('');
      const story = await createStory(projectId, {
        title: title.trim(),
        description: description.trim(),
        sourceType,
        sourceUrl: sourceType === 'url' ? sourceUrl.trim() : null,
      });
      navigate('/projects/' + projectId + '/stories/' + story.id);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="page max-w-3xl">
      <Link to={'/projects/' + projectId + '/stories'} className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to stories
      </Link>
      <div className="page-header">
        <div>
          <h1 className="page-title">New user story</h1>
          <p className="page-subtitle">Paste a user story or feature description. Test scenarios will be generated automatically.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">{error}</div>
        )}

        <div>
          <label className="label">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. User login with email and password" className="input" maxLength={256} autoFocus />
        </div>

        <div>
          <label className="label">Story description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Paste the full user story here including acceptance criteria..."
            className="input resize-y min-h-[200px]" maxLength={10240} />
          <p className="text-xs text-surface-400 dark:text-surface-500 mt-1 text-right tabular-nums">{description.length}/10,240 characters (min 20)</p>
        </div>

        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className="label">Source</label>
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="input">
              <option value="text">Pasted text</option>
              <option value="url">URL (Jira/GitHub/etc.)</option>
            </select>
          </div>
          {sourceType === 'url' && (
            <div className="flex-[2] min-w-[200px]">
              <label className="label">Source URL</label>
              <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://jira.example.com/browse/PROJ-123" className="input" />
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate('/projects/' + projectId + '/stories')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Creating...' : 'Create story & generate scenarios'}
          </button>
        </div>
      </form>
    </div>
  );
}
