import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft, Plus, Loader2, Trash2, Pencil, Check, X, Zap,
  AlertTriangle, Search, Copy, Shield, BookOpen, Link2, ExternalLink,
} from 'lucide-react';
import ExportCsvButton from '../components/ExportCsvButton';

const PRIORITY_STYLES = {
  critical: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20',
  high:     'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/15 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-400/20',
  medium:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  low:      'bg-surface-100 text-surface-600 ring-1 ring-inset ring-surface-300/40 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700',
};

const STATUS_STYLES = {
  draft:    'bg-surface-100 text-surface-600 ring-1 ring-inset ring-surface-300/40 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700',
  active:   'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-400/20',
  passed:   'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  failed:   'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20',
  archived: 'bg-surface-100 text-surface-500 ring-1 ring-inset ring-surface-300/40 dark:bg-surface-800 dark:text-surface-400 dark:ring-surface-700',
};

const ANALYSIS_TYPES = [
  { value: 'coverage_gaps', label: 'Coverage Gaps', icon: Search, desc: 'Find missing test scenarios' },
  { value: 'quality_review', label: 'Quality Review', icon: Check, desc: 'Assess clarity and completeness' },
  { value: 'risk_assessment', label: 'Risk Assessment', icon: AlertTriangle, desc: 'Identify high-risk areas' },
  { value: 'duplicate_detection', label: 'Duplicate Detection', icon: Copy, desc: 'Find overlapping tests' },
];

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  const [editingTc, setEditingTc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [editStatus, setEditStatus] = useState('draft');
  const [saving, setSaving] = useState(false);

  const [jiraLinkTc, setJiraLinkTc] = useState(null);
  const [jiraSearch, setJiraSearch] = useState('');
  const [jiraResults, setJiraResults] = useState([]);
  const [jiraSearching, setJiraSearching] = useState(false);
  const [jiraLinking, setJiraLinking] = useState(false);
  const [jiraError, setJiraError] = useState('');

  const [showAnalyze, setShowAnalyze] = useState(false);
  const [analysisType, setAnalysisType] = useState('coverage_gaps');
  const [selectedIds, setSelectedIds] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [proj, tcs] = await Promise.all([
        api.getProject(projectId),
        api.getTestCases(projectId, { limit: 100 }),
      ]);
      setProject(proj);
      setTestCases(tcs.data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateTestCase = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const tc = await api.createTestCase(projectId, { title: newTitle, content: newContent, priority: newPriority });
      setTestCases((prev) => [tc, ...prev]);
      setShowCreate(false); setNewTitle(''); setNewContent(''); setNewPriority('medium');
    } catch (err) { setError(err.message); }
    finally { setCreating(false); }
  };

  const openEdit = (tc) => {
    setEditingTc(tc); setEditTitle(tc.title); setEditContent(tc.content);
    setEditPriority(tc.priority); setEditStatus(tc.status);
  };

  const handleEditTestCase = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateTestCase(projectId, editingTc.id, {
        title: editTitle, content: editContent, priority: editPriority, status: editStatus,
      });
      setTestCases((prev) => prev.map((tc) => (tc.id === editingTc.id ? updated : tc)));
      setEditingTc(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDeleteTestCase = async (id) => {
    if (!confirm('Delete this test case?')) return;
    try {
      await api.deleteTestCase(projectId, id);
      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    } catch (err) { setError(err.message); }
  };

  const handleJiraSearch = async (q) => {
    setJiraSearch(q);
    if (q.length < 2) { setJiraResults([]); return; }
    setJiraSearching(true);
    try {
      const res = await api.request('GET', `/jira/search?q=${encodeURIComponent(q)}`);
      setJiraResults(res.data || []);
    } catch { setJiraResults([]); }
    finally { setJiraSearching(false); }
  };

  const handleJiraLink = async (issue) => {
    if (!jiraLinkTc) return;
    setJiraLinking(true); setJiraError('');
    try {
      await api.linkTestCaseToJira(projectId, jiraLinkTc.id, issue.key, issue.summary);
      setTestCases((prev) => prev.map((tc) => tc.id === jiraLinkTc.id ? { ...tc, jiraIssueKey: issue.key } : tc));
      setJiraLinkTc(null); setJiraSearch(''); setJiraResults([]);
    } catch (err) { setJiraError(err.message); }
    finally { setJiraLinking(false); }
  };

  const handleJiraUnlink = async (tc) => {
    try {
      await api.unlinkTestCaseFromJira(projectId, tc.id);
      setTestCases((prev) => prev.map((t) => t.id === tc.id ? { ...t, jiraIssueKey: null } : t));
    } catch (err) { setError(err.message); }
  };

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === testCases.length ? [] : testCases.map((tc) => tc.id));

  const handleAnalyze = async () => {
    if (selectedIds.length === 0) return;
    setAnalyzing(true); setAnalysisError(''); setAnalysisResult(null);
    try {
      const result = await api.analyzeTestCases(projectId, selectedIds, analysisType);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(err.message.includes('AI')
        ? 'OpenAI API key not configured. Add your key to .env and restart the server.'
        : err.message);
    } finally { setAnalyzing(false); }
  };

  if (!loading && !project) {
    return (
      <div className="page">
        <div className="empty">
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-1">Project not found</h3>
          <Link to="/projects" className="btn-secondary mt-4"><ArrowLeft size={14} /> Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="page-header">
        <div className="min-w-0">
          <h1 className="page-title truncate">{loading ? 'Loading...' : project.name}</h1>
          {project?.description && <p className="page-subtitle">{project.description}</p>}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Link to={`/projects/${projectId}/stories`} className="btn-secondary">
            <BookOpen size={16} /> Stories
          </Link>
          <ExportCsvButton projectId={projectId} disabled={testCases.length === 0} />
          <button onClick={() => setShowAnalyze(!showAnalyze)} disabled={testCases.length === 0} className="btn-secondary">
            <Zap size={16} /> Analyze
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> New test
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 flex items-start justify-between gap-3
                                     dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"><X size={16} /></button>
        </div>
      )}

      {showAnalyze && (
        <div className="card p-6 mb-6 ring-1 ring-brand-200 bg-gradient-to-br from-brand-50/60 to-purple-50/40
                        dark:ring-lime-500/20 dark:bg-none dark:bg-surface-900/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 text-white flex items-center justify-center
                            dark:from-lime-500 dark:to-lime-600 dark:text-surface-950">
              <Zap size={16} />
            </div>
            <h3 className="font-semibold text-surface-900 dark:text-surface-50">Analyze</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {ANALYSIS_TYPES.map(({ value, label, icon: Icon, desc }) => (
              <button key={value} onClick={() => setAnalysisType(value)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  analysisType === value
                    ? 'border-brand-400 bg-white shadow-soft dark:border-lime-500 dark:bg-surface-900'
                    : 'border-surface-200/60 bg-white/60 hover:bg-white hover:border-surface-300 dark:border-surface-700 dark:bg-surface-900/40 dark:hover:bg-surface-900 dark:hover:border-surface-600'
                }`}>
                <div className="flex items-center gap-2 text-sm font-medium text-surface-900 dark:text-surface-100">
                  <Icon size={14} /> {label}
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-surface-600 dark:text-surface-300">
              <span className="tabular-nums">{selectedIds.length}</span> of <span className="tabular-nums">{testCases.length}</span> selected
            </span>
            <div className="flex gap-2">
              <button onClick={toggleSelectAll} className="btn-ghost btn-xs">
                {selectedIds.length === testCases.length ? 'Deselect all' : 'Select all'}
              </button>
              <button onClick={handleAnalyze} disabled={selectedIds.length === 0 || analyzing} className="btn-primary">
                {analyzing && <Loader2 size={16} className="animate-spin" />}
                Analyze
              </button>
            </div>
          </div>

          {analysisError && (
            <div className="mt-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200
                            dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">{analysisError}</div>
          )}

          {analysisResult && (
            <div className="mt-4 bg-white rounded-xl ring-1 ring-surface-200/60 p-5
                            dark:bg-surface-900 dark:ring-surface-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-surface-900 dark:text-surface-50">
                  {ANALYSIS_TYPES.find((t) => t.value === analysisResult.analysisType)?.label} results
                </h4>
                <span className="text-xs text-surface-400 dark:text-surface-500 tabular-nums">{analysisResult.tokenUsage?.total} tokens</span>
              </div>

              {analysisResult.result?.summary && (
                <p className="text-sm text-surface-700 dark:text-surface-300 mb-4 leading-relaxed">{analysisResult.result.summary}</p>
              )}

              {analysisResult.result?.gaps?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">Gaps found</h5>
                  {analysisResult.result.gaps.map((gap, i) => (
                    <div key={i} className="bg-purple-50 rounded-lg p-3 ring-1 ring-inset ring-purple-100
                                            dark:bg-purple-500/10 dark:ring-purple-400/20">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${PRIORITY_STYLES[gap.suggestedPriority] || PRIORITY_STYLES.medium}`}>{gap.suggestedPriority}</span>
                        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">{gap.area}</span>
                      </div>
                      <p className="text-sm text-surface-600 dark:text-surface-300 mt-1">{gap.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysisResult.result?.recommendations?.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-2">Recommendations</h5>
                  <ul className="space-y-1">
                    {analysisResult.result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-surface-600 dark:text-surface-300 flex gap-2">
                        <span className="text-brand-500 dark:text-lime-400 mt-0.5">&#8226;</span>{rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.result?.risks?.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h5 className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">Risks</h5>
                  {analysisResult.result.risks.map((risk, i) => (
                    <div key={i} className="bg-red-50 rounded-lg p-3 ring-1 ring-inset ring-red-100
                                            dark:bg-red-500/10 dark:ring-red-400/20">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-red-500 dark:text-red-400" />
                        <span className="text-sm font-medium text-surface-900 dark:text-surface-100">{risk.area}</span>
                        <span className="badge bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">{risk.riskLevel}</span>
                      </div>
                      <p className="text-sm text-surface-600 dark:text-surface-300 mt-1">{risk.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysisResult.result?.duplicates?.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h5 className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">Duplicates</h5>
                  {analysisResult.result.duplicates.map((dup, i) => (
                    <div key={i} className="bg-amber-50 rounded-lg p-3 ring-1 ring-inset ring-amber-100
                                            dark:bg-amber-500/10 dark:ring-amber-400/20">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{dup.reason}</p>
                      <p className="text-sm text-surface-600 dark:text-surface-300 mt-1">{dup.mergeRecommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {analysisResult.result?.issues?.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h5 className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">Issues</h5>
                  {analysisResult.result.issues.map((issue, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-3 ring-1 ring-inset ring-blue-100
                                            dark:bg-blue-500/10 dark:ring-blue-400/20">
                      <span className="text-sm font-medium text-surface-900 dark:text-surface-100">{issue.issue}</span>
                      <p className="text-sm text-surface-600 dark:text-surface-300 mt-1">{issue.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-lg shadow-soft-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">New test case</h2>
              <button onClick={() => setShowCreate(false)} className="icon-btn" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateTestCase} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input" placeholder="E.g. Valid card checkout" required autoFocus />
              </div>
              <div>
                <label className="label">Steps</label>
                <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} className="input font-mono text-sm resize-none" rows={6}
                  placeholder={"Step 1: Navigate to checkout\nStep 2: Enter payment details\nStep 3: Click submit\nExpected: Order confirmation displayed"} required />
              </div>
              <div>
                <label className="label">Priority</label>
                <div className="flex gap-2 flex-wrap">
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <button key={p} type="button" onClick={() => setNewPriority(p)}
                      className={`badge capitalize cursor-pointer transition-colors ${newPriority === p ? PRIORITY_STYLES[p] : 'bg-surface-50 text-surface-400 ring-1 ring-inset ring-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:ring-surface-700'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating && <Loader2 size={16} className="animate-spin" />} Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTc && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setEditingTc(null)}>
          <div className="card p-6 w-full max-w-lg shadow-soft-lg animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Edit test case</h2>
              <button onClick={() => setEditingTc(null)} className="icon-btn" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={handleEditTestCase} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" required autoFocus />
              </div>
              <div>
                <label className="label">Steps</label>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="input font-mono text-sm resize-none" rows={6} required />
              </div>
              <div>
                <label className="label">Priority</label>
                <div className="flex gap-2 flex-wrap">
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <button key={p} type="button" onClick={() => setEditPriority(p)}
                      className={`badge capitalize cursor-pointer transition-colors ${editPriority === p ? PRIORITY_STYLES[p] : 'bg-surface-50 text-surface-400 ring-1 ring-inset ring-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:ring-surface-700'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(STATUS_STYLES).map((s) => (
                    <button key={s} type="button" onClick={() => setEditStatus(s)}
                      className={`badge capitalize cursor-pointer transition-colors ${editStatus === s ? STATUS_STYLES[s] : 'bg-surface-50 text-surface-400 ring-1 ring-inset ring-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:ring-surface-700'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditingTc(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 size={16} className="animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {jiraLinkTc && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setJiraLinkTc(null)}>
          <div className="card p-6 w-full max-w-md shadow-soft-lg animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Link to Jira</h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 truncate">{jiraLinkTc.title}</p>
              </div>
              <button onClick={() => { setJiraLinkTc(null); setJiraSearch(''); setJiraResults([]); setJiraError(''); }} className="icon-btn" aria-label="Close"><X size={16} /></button>
            </div>
            <input className="input mb-3" placeholder="Search by issue key or title (e.g. PROJ-123)"
              value={jiraSearch} onChange={(e) => handleJiraSearch(e.target.value)} autoFocus />
            {jiraSearching && <p className="text-sm text-surface-400 dark:text-surface-500 mb-2">Searching…</p>}
            {jiraResults.length > 0 && (
              <div className="rounded-lg ring-1 ring-surface-200/60 dark:ring-surface-700 divide-y divide-surface-100 dark:divide-surface-800 max-h-48 overflow-y-auto mb-3">
                {jiraResults.map((issue) => (
                  <button key={issue.key} onClick={() => handleJiraLink(issue)} disabled={jiraLinking}
                    className="w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-surface-800 flex items-center gap-2 transition-colors">
                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">{issue.key}</span>
                    <span className="text-sm text-surface-700 dark:text-surface-200 truncate">{issue.summary}</span>
                    <ExternalLink size={12} className="text-surface-400 dark:text-surface-500 shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            )}
            {jiraError && <p className="text-sm text-red-600 dark:text-red-300 mb-2">{jiraError}</p>}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-2/5 mb-2" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          ))}
        </div>
      )}

      {!loading && testCases.length === 0 && (
        <div className="empty">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 dark:bg-lime-500/10 dark:text-lime-400 flex items-center justify-center mb-4">
            <Shield size={24} />
          </div>
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100 mb-1">No tests yet</h3>
          <p className="text-surface-500 dark:text-surface-400 text-sm mb-6 max-w-xs">Add your first test case to start building coverage.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> New test</button>
        </div>
      )}

      {!loading && testCases.length > 0 && (
        <div className="space-y-2">
          {testCases.map((tc) => (
            <div key={tc.id}
              className={`card p-4 transition-all ${selectedIds.includes(tc.id) ? 'ring-2 ring-brand-400/40 border-brand-300 bg-brand-50/30 dark:ring-lime-500/40 dark:border-lime-500/40 dark:bg-lime-500/5' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {showAnalyze && (
                    <input type="checkbox" checked={selectedIds.includes(tc.id)} onChange={() => toggleSelect(tc.id)}
                      className="mt-1 w-4 h-4 text-brand-600 rounded border-surface-300 focus:ring-brand-500
                                 dark:bg-surface-800 dark:border-surface-600 dark:text-lime-500 dark:focus:ring-lime-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm text-surface-900 dark:text-surface-100">{tc.title}</h3>
                      <span className={`badge ${PRIORITY_STYLES[tc.priority]}`}>{tc.priority}</span>
                      <span className={`badge ${STATUS_STYLES[tc.status]}`}>{tc.status}</span>
                    </div>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1.5 whitespace-pre-wrap font-mono leading-relaxed">{tc.content}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {tc.jiraIssueKey ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full ring-1 ring-inset ring-blue-200
                                     dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/30">
                      <Link2 size={10} /> {tc.jiraIssueKey}
                      <button onClick={() => handleJiraUnlink(tc)} className="ml-0.5 hover:text-red-500 dark:hover:text-red-400" title="Remove Jira link">×</button>
                    </span>
                  ) : (
                    <button onClick={() => { setJiraLinkTc(tc); setJiraSearch(''); setJiraResults([]); setJiraError(''); }}
                      className="icon-btn hover:text-blue-500 dark:hover:text-blue-400" aria-label="Link to Jira">
                      <Link2 size={14} />
                    </button>
                  )}
                  <button onClick={() => openEdit(tc)} className="icon-btn" aria-label="Edit"><Pencil size={14} /></button>
                  <button onClick={() => handleDeleteTestCase(tc.id)} className="icon-btn hover:text-red-500 dark:hover:text-red-400" aria-label="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
