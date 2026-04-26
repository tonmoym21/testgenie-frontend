import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Loader2, Trash2, Check, X, Download, AlertTriangle, RotateCcw,
} from 'lucide-react';
import {
  getStory, listScenarios, updateScenarioStatus, createScenario, getCoverage, exportStoryCsv,
  listManualTestCases, createManualTestCase, deleteManualTestCase,
} from '../services/storyApi';
import GeneratePlaywrightButton from '../components/GeneratePlaywrightButton';

const CATEGORY_LABELS = {
  happy_path: 'Happy Path', negative: 'Negative', edge: 'Edge Cases', validation: 'Validation',
  role_permission: 'Role / Permission', state_transition: 'State Transition',
  api_impact: 'API Impact', non_functional: 'Non-Functional',
};
const VALID_CATEGORIES = ['happy_path', 'negative', 'edge', 'validation', 'role_permission', 'state_transition', 'api_impact', 'non_functional'];
const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

const PRIORITY_STYLES = {
  critical: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20',
  high:     'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/15 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-400/20',
  medium:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
  low:      'bg-surface-100 text-surface-600 ring-1 ring-inset ring-surface-300/40 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700',
};

const P_STYLES = {
  P0: 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-300 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-400/30',
  P1: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30',
  P2: 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/30',
  P3: 'bg-surface-100 text-surface-600 ring-1 ring-inset ring-surface-300 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700',
};

const STATUS_BADGE = {
  pending:  'badge-warn',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

export default function StoryDetailPage() {
  const { projectId, storyId } = useParams();
  const [story, setStory] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);

  const [activeTab, setActiveTab] = useState('ai');

  // Manual test cases state
  const [manualTcs, setManualTcs] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ title: '', content: '', priority: 'medium' });
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  // Manual AI scenario creation
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ category: 'happy_path', title: '', summary: '', preconditions: '', test_intent: '', expected_outcome: '', priority: 'P1' });
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [s, list, cov] = await Promise.all([
        getStory(projectId, storyId),
        listScenarios(projectId, storyId),
        getCoverage(projectId, storyId),
      ]);
      setStory(s); setScenarios(list); setCoverage(cov);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId, storyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadManualTcs = useCallback(async () => {
    setManualLoading(true);
    try {
      const data = await listManualTestCases(projectId, storyId);
      setManualTcs(Array.isArray(data) ? data : []);
    } catch (err) { setManualError(err.message); }
    finally { setManualLoading(false); }
  }, [projectId, storyId]);

  useEffect(() => {
    if (activeTab === 'manual') loadManualTcs();
  }, [activeTab, loadManualTcs]);

  const handleAddManualTc = async (e) => {
    e.preventDefault();
    setManualSaving(true); setManualError('');
    try {
      const created = await createManualTestCase(projectId, storyId, manualForm);
      setManualTcs((prev) => [created, ...prev]);
      setShowManualForm(false);
      setManualForm({ title: '', content: '', priority: 'medium' });
    } catch (err) { setManualError(err.message); }
    finally { setManualSaving(false); }
  };

  const handleDeleteManualTc = async (tcId) => {
    if (!window.confirm('Delete this test case?')) return;
    try {
      await deleteManualTestCase(projectId, storyId, tcId);
      setManualTcs((prev) => prev.filter((t) => t.id !== tcId));
    } catch (err) { alert('Delete failed: ' + err.message); }
  };

  const handleStatusChange = async (scenarioId, newStatus) => {
    try {
      const updated = await updateScenarioStatus(projectId, storyId, scenarioId, newStatus);
      setScenarios((prev) => prev.map((s) => (s.id === scenarioId ? updated : s)));
      const cov = await getCoverage(projectId, storyId);
      setCoverage(cov);
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const handleAddScenario = async (e) => {
    e.preventDefault();
    setAddError(''); setAddSaving(true);
    try {
      const preconditionsArr = addForm.preconditions.split('\n').map((s) => s.trim()).filter(Boolean);
      const created = await createScenario(projectId, storyId, {
        category: addForm.category,
        title: addForm.title,
        summary: addForm.summary,
        preconditions: preconditionsArr,
        test_intent: addForm.test_intent,
        expected_outcome: addForm.expected_outcome,
        priority: addForm.priority,
      });
      setScenarios((prev) => [...prev, created]);
      const cov = await getCoverage(projectId, storyId);
      setCoverage(cov);
      setShowAddModal(false);
      setAddForm({ category: 'happy_path', title: '', summary: '', preconditions: '', test_intent: '', expected_outcome: '', priority: 'P1' });
    } catch (err) { setAddError(err.message || 'Failed to add scenario'); }
    finally { setAddSaving(false); }
  };

  const handleBulkAction = async (category, newStatus) => {
    const targets = scenarios.filter((s) => s.category === category && s.status !== newStatus);
    for (const t of targets) await handleStatusChange(t.id, newStatus);
  };

  const handleExport = async () => {
    try {
      setExporting(true); setExportMsg(null);
      const result = await exportStoryCsv(projectId, storyId);
      setExportMsg('Downloaded: ' + result.filename);
    } catch (err) { setExportMsg('Error: ' + err.message); }
    finally { setExporting(false); }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="text-center py-20 text-surface-500 dark:text-surface-400">
          <Loader2 size={28} className="mx-auto mb-3 animate-spin" /> Loading story…
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page">
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">
          {error}
        </div>
      </div>
    );
  }
  if (!story) {
    return (
      <div className="page">
        <div className="empty">
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">Story not found</h3>
        </div>
      </div>
    );
  }

  const approvedCount = scenarios.filter((s) => s.status === 'approved').length;
  const pendingCount = scenarios.filter((s) => s.status === 'pending').length;
  const rejectedCount = scenarios.filter((s) => s.status === 'rejected').length;
  const canExport = approvedCount > 0;

  const grouped = {};
  scenarios.forEach((s) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  return (
    <div className="page max-w-4xl">
      <Link
        to={`/projects/${projectId}/stories`}
        className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to stories
      </Link>

      <h1 className="page-title">{story.title}</h1>
      {story.description && (
        <p className="text-sm text-surface-600 dark:text-surface-300 mb-6 leading-relaxed whitespace-pre-wrap">
          {story.description}
        </p>
      )}

      {/* Tabs */}
      <div className="tabs mb-5">
        <button
          onClick={() => setActiveTab('ai')}
          className={`tab ${activeTab === 'ai' ? 'tab-active' : ''}`}
        >
          AI Scenarios <span className="text-surface-400 dark:text-surface-500 tabular-nums">({scenarios.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`tab ${activeTab === 'manual' ? 'tab-active' : ''}`}
        >
          Manual <span className="text-surface-400 dark:text-surface-500 tabular-nums">({manualTcs.length})</span>
        </button>
      </div>

      {/* Manual tab */}
      {activeTab === 'manual' && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-4">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Manual test cases for this story, visible to your team.
            </p>
            <button onClick={() => setShowManualForm(true)} className="btn-primary btn-sm">
              <Plus size={14} /> New test
            </button>
          </div>

          {/* Manual form — modeled on ProjectDetailPage's create modal for visual parity */}
          {showManualForm && (
            <div className="card p-5 mb-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-base font-semibold text-surface-900 dark:text-surface-50">New test case</h3>
                <button onClick={() => { setShowManualForm(false); setManualError(''); }} className="icon-btn" aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddManualTc} className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input
                    value={manualForm.title}
                    onChange={(e) => setManualForm((f) => ({ ...f, title: e.target.value }))}
                    className="input"
                    placeholder="E.g. User can log in with valid credentials"
                    required autoFocus
                  />
                </div>
                <div>
                  <label className="label">Steps</label>
                  <textarea
                    value={manualForm.content}
                    onChange={(e) => setManualForm((f) => ({ ...f, content: e.target.value }))}
                    className="input font-mono text-sm resize-none"
                    rows={6}
                    placeholder={'Step 1: Navigate to login page\nStep 2: Enter valid credentials\nStep 3: Click Submit\nExpected: User is redirected to dashboard'}
                    required
                  />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <div className="flex gap-2 flex-wrap">
                    {['low', 'medium', 'high', 'critical'].map((p) => (
                      <button
                        key={p} type="button"
                        onClick={() => setManualForm((f) => ({ ...f, priority: p }))}
                        className={`badge capitalize cursor-pointer transition-colors ${
                          manualForm.priority === p
                            ? PRIORITY_STYLES[p]
                            : 'bg-surface-50 text-surface-400 ring-1 ring-inset ring-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:ring-surface-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                {manualError && (
                  <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">
                    {manualError}
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => { setShowManualForm(false); setManualError(''); }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={manualSaving} className="btn-primary">
                    {manualSaving && <Loader2 size={16} className="animate-spin" />} Add
                  </button>
                </div>
              </form>
            </div>
          )}

          {manualLoading && (
            <p className="text-center py-8 text-surface-400 dark:text-surface-500 text-sm">Loading…</p>
          )}

          {!manualLoading && manualTcs.length === 0 && (
            <div className="empty">
              <p className="text-sm text-surface-500 dark:text-surface-400">No manual test cases yet.</p>
            </div>
          )}

          {!manualLoading && manualTcs.length > 0 && (
            <div className="space-y-2">
              {manualTcs.map((tc) => (
                <div key={tc.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`badge ${PRIORITY_STYLES[tc.priority] || PRIORITY_STYLES.medium}`}>{tc.priority}</span>
                        {tc.jiraIssueKey && (
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full ring-1 ring-inset ring-blue-200
                                           dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/30">
                            {tc.jiraIssueKey}
                          </span>
                        )}
                        {tc.createdByEmail && (
                          <span className="text-xs text-surface-400 dark:text-surface-500">by {tc.createdByEmail}</span>
                        )}
                      </div>
                      <h4 className="font-medium text-sm text-surface-900 dark:text-surface-100">{tc.title}</h4>
                      <pre className="text-xs text-surface-500 dark:text-surface-400 mt-1.5 whitespace-pre-wrap font-mono leading-relaxed">{tc.content}</pre>
                    </div>
                    <button
                      onClick={() => handleDeleteManualTc(tc.id)}
                      className="icon-btn hover:text-red-500 dark:hover:text-red-400 shrink-0"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI tab */}
      {activeTab === 'ai' && (
        <div>
          {/* Summary bar */}
          <div className="card p-4 mb-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <Stat label="Total" value={scenarios.length} tone="neutral" />
              <Stat label="Approved" value={approvedCount} tone="success" />
              <Stat label="Pending" value={pendingCount} tone="warn" />
              <Stat label="Rejected" value={rejectedCount} tone="danger" />
              {coverage && <Stat label="Quality" value={coverage.qualityScore + '%'} tone="purple" />}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowAddModal(true)} className="btn-secondary btn-sm">
                <Plus size={14} /> Manual scenario
              </button>
              <button
                onClick={handleExport}
                disabled={!canExport || exporting}
                className="btn-secondary btn-sm"
              >
                <Download size={14} />
                {exporting ? 'Exporting…' : `Export (${approvedCount})`}
              </button>
              <GeneratePlaywrightButton projectId={projectId} storyIngestionId={storyId} storyTitle={story.title} />
            </div>
          </div>

          {exportMsg && (
            <div className={`text-sm px-4 py-3 rounded-lg border mb-4 ${
              exportMsg.startsWith('Error')
                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/30'
            }`}>
              {exportMsg}
            </div>
          )}

          {coverage && coverage.missingCategories.length > 0 && (
            <div className="bg-amber-50 text-amber-800 text-sm px-4 py-3 rounded-lg border border-amber-200 mb-4 flex items-start gap-2
                            dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-400/30">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>Missing coverage: {coverage.missingCategories.map((c) => CATEGORY_LABELS[c] || c).join(', ')}</span>
            </div>
          )}

          {scenarios.length === 0 && (
            <div className="empty">
              <p className="text-sm text-surface-500 dark:text-surface-400">No scenarios generated for this story.</p>
            </div>
          )}

          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-6">
              <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-2 mb-3">
                <h2 className="text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                  {CATEGORY_LABELS[category] || category}
                  <span className="badge-muted tabular-nums">{items.length}</span>
                </h2>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleBulkAction(category, 'approved')}
                    className="text-xs px-2.5 py-1 rounded border border-surface-200 text-emerald-600 hover:bg-emerald-50
                               dark:border-surface-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                  >
                    Approve all
                  </button>
                  <button
                    onClick={() => handleBulkAction(category, 'rejected')}
                    className="text-xs px-2.5 py-1 rounded border border-surface-200 text-red-600 hover:bg-red-50
                               dark:border-surface-700 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Reject all
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {items.map((s) => (
                  <ScenarioCard key={s.id} scenario={s} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Scenario modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => { setShowAddModal(false); setAddError(''); }}
        >
          <div
            className="card p-6 w-full max-w-lg shadow-soft-lg animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">Add scenario</h2>
              <button onClick={() => { setShowAddModal(false); setAddError(''); }} className="icon-btn" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddScenario} className="space-y-4">
              <div>
                <label className="label">Category</label>
                <select
                  value={addForm.category}
                  onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                  className="input" required
                >
                  {VALID_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <div className="flex gap-2 flex-wrap">
                  {VALID_PRIORITIES.map((p) => (
                    <button
                      key={p} type="button"
                      onClick={() => setAddForm((f) => ({ ...f, priority: p }))}
                      className={`badge cursor-pointer transition-colors ${
                        addForm.priority === p
                          ? P_STYLES[p]
                          : 'bg-surface-50 text-surface-400 ring-1 ring-inset ring-surface-200 dark:bg-surface-800 dark:text-surface-500 dark:ring-surface-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Title</label>
                <input
                  value={addForm.title} required minLength={5} maxLength={120}
                  onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  className="input"
                  placeholder="E.g. Login with valid credentials succeeds"
                />
              </div>
              <div>
                <label className="label">Summary</label>
                <textarea
                  value={addForm.summary} rows={2} maxLength={300}
                  onChange={(e) => setAddForm((f) => ({ ...f, summary: e.target.value }))}
                  className="input resize-none"
                  placeholder="Brief description of what this scenario tests and why it matters"
                />
              </div>
              <div>
                <label className="label">Preconditions (one per line)</label>
                <textarea
                  value={addForm.preconditions} rows={3}
                  onChange={(e) => setAddForm((f) => ({ ...f, preconditions: e.target.value }))}
                  className="input font-mono text-sm resize-none"
                  placeholder={'User is authenticated\nTest record exists in DB'}
                />
              </div>
              <div>
                <label className="label">Test intent</label>
                <input
                  value={addForm.test_intent} maxLength={200}
                  onChange={(e) => setAddForm((f) => ({ ...f, test_intent: e.target.value }))}
                  className="input"
                  placeholder="Business risk or compliance requirement being validated"
                />
              </div>
              <div>
                <label className="label">Expected outcome</label>
                <textarea
                  value={addForm.expected_outcome} required rows={3} minLength={5} maxLength={300}
                  onChange={(e) => setAddForm((f) => ({ ...f, expected_outcome: e.target.value }))}
                  className="input resize-none"
                  placeholder='Specific, verifiable result — e.g. "Dashboard shows success banner. Record saved in DB."'
                />
              </div>
              {addError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200 dark:bg-red-500/10 dark:text-red-200 dark:border-red-400/30">
                  {addError}
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setAddError(''); }} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={addSaving} className="btn-primary">
                  {addSaving && <Loader2 size={16} className="animate-spin" />} Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    neutral: 'text-surface-700 dark:text-surface-200',
    success: 'text-emerald-600 dark:text-emerald-400',
    warn:    'text-amber-600 dark:text-amber-400',
    danger:  'text-red-600 dark:text-red-400',
    purple:  'text-purple-600 dark:text-purple-300',
  };
  return (
    <div className="text-center">
      <div className={`text-xl font-semibold tabular-nums ${tones[tone] || tones.neutral}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-surface-500 dark:text-surface-400 font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function ScenarioCard({ scenario: s, onStatusChange }) {
  let preconditions = [];
  if (Array.isArray(s.preconditions)) preconditions = s.preconditions;
  else if (typeof s.preconditions === 'string') {
    try { preconditions = JSON.parse(s.preconditions); } catch { preconditions = [s.preconditions]; }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={STATUS_BADGE[s.status] || 'badge-muted'}>{s.status}</span>
            <span className={`badge ${P_STYLES[s.priority] || P_STYLES.P3}`}>{s.priority}</span>
          </div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">{s.title}</h3>
          {s.summary && (
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">{s.summary}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {s.status !== 'approved' && (
            <button
              onClick={() => onStatusChange(s.id, 'approved')}
              title="Approve"
              className="w-7 h-7 rounded inline-flex items-center justify-center text-emerald-600 hover:bg-emerald-50 ring-1 ring-emerald-200
                         dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:ring-emerald-400/30"
            >
              <Check size={14} />
            </button>
          )}
          {s.status !== 'rejected' && (
            <button
              onClick={() => onStatusChange(s.id, 'rejected')}
              title="Reject"
              className="w-7 h-7 rounded inline-flex items-center justify-center text-red-600 hover:bg-red-50 ring-1 ring-red-200
                         dark:text-red-400 dark:hover:bg-red-500/10 dark:ring-red-400/30"
            >
              <X size={14} />
            </button>
          )}
          {s.status !== 'pending' && (
            <button
              onClick={() => onStatusChange(s.id, 'pending')}
              title="Reset to pending"
              className="w-7 h-7 rounded inline-flex items-center justify-center text-surface-500 hover:bg-surface-100 ring-1 ring-surface-200
                         dark:text-surface-400 dark:hover:bg-surface-800 dark:ring-surface-700"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {(s.test_intent || preconditions.length > 0 || s.expected_outcome) && (
        <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800 text-sm text-surface-700 dark:text-surface-300 space-y-1">
          {s.test_intent && (
            <div><span className="font-semibold">Test intent: </span>{s.test_intent}</div>
          )}
          {preconditions.length > 0 && (
            <div><span className="font-semibold">Preconditions: </span>{preconditions.join(' | ')}</div>
          )}
          {s.expected_outcome && (
            <div><span className="font-semibold">Expected: </span>{s.expected_outcome}</div>
          )}
        </div>
      )}
    </div>
  );
}
