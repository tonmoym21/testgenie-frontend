import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft, Plus, Loader2, Trash2, Pencil, Check, X, Zap,
  ChevronDown, AlertTriangle, Search, Copy, Shield
} from 'lucide-react';

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  passed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-500',
};

const ANALYSIS_TYPES = [
  { value: 'coverage_gaps', label: 'Coverage Gaps', icon: Search, desc: 'Find missing test scenarios' },
  { value: 'quality_review', label: 'Quality Review', icon: Check, desc: 'Assess clarity and completeness' },
  { value: 'risk_assessment', label: 'Risk Assessment', icon: AlertTriangle, desc: 'Identify high-risk areas' },
  { value: 'duplicate_detection', label: 'Duplicate Detection', icon: Copy, desc: 'Find overlapping tests' },
];

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create test case state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  // Analyze state
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTestCase = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const tc = await api.createTestCase(projectId, {
        title: newTitle,
        content: newContent,
        priority: newPriority,
      });
      setTestCases((prev) => [tc, ...prev]);
      setShowCreate(false);
      setNewTitle('');
      setNewContent('');
      setNewPriority('medium');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTestCase = async (id) => {
    if (!confirm('Delete this test case?')) return;
    try {
      await api.deleteTestCase(projectId, id);
      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.updateTestCase(projectId, id, { status });
      setTestCases((prev) => prev.map((tc) => (tc.id === id ? updated : tc)));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === testCases.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(testCases.map((tc) => tc.id));
    }
  };

  const handleAnalyze = async () => {
    if (selectedIds.length === 0) return;
    setAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);
    try {
      const result = await api.analyzeTestCases(projectId, selectedIds, analysisType);
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisError(
        err.message.includes('AI')
          ? 'OpenAI API key not configured. Add your key to .env and restart the server.'
          : err.message
      );
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Project not found</p>
        <Link to="/projects" className="text-brand-600 text-sm mt-2 inline-block">Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link to="/projects" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
          <ArrowLeft size={14} /> Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAnalyze(!showAnalyze)}
              disabled={testCases.length === 0}
              className="btn-secondary"
            >
              <Zap size={16} />
              Analyze
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} />
              Add Test Case
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Analyze panel */}
      {showAnalyze && (
        <div className="card p-6 mb-6 border-brand-200 bg-brand-50/30">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-brand-600" />
            <h3 className="font-semibold text-brand-900">AI Analysis</h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {ANALYSIS_TYPES.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                onClick={() => setAnalysisType(value)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  analysisType === value
                    ? 'border-brand-500 bg-white shadow-sm'
                    : 'border-transparent bg-white/60 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Icon size={14} />
                  {label}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedIds.length} of {testCases.length} test cases selected
            </span>
            <div className="flex gap-2">
              <button onClick={toggleSelectAll} className="btn-ghost text-xs">
                {selectedIds.length === testCases.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={selectedIds.length === 0 || analyzing}
                className="btn-primary"
              >
                {analyzing && <Loader2 size={16} className="animate-spin" />}
                Run Analysis
              </button>
            </div>
          </div>

          {analysisError && (
            <div className="mt-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
              {analysisError}
            </div>
          )}

          {analysisResult && (
            <div className="mt-4 bg-white rounded-lg border p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">
                  {ANALYSIS_TYPES.find((t) => t.value === analysisResult.analysisType)?.label} Results
                </h4>
                <span className="text-xs text-gray-400">
                  {analysisResult.tokenUsage?.total} tokens used
                </span>
              </div>

              {analysisResult.result?.summary && (
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">{analysisResult.result.summary}</p>
              )}

              {/* Render gaps */}
              {analysisResult.result?.gaps?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase text-gray-400">Gaps Found</h5>
                  {analysisResult.result.gaps.map((gap, i) => (
                    <div key={i} className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${PRIORITY_STYLES[gap.suggestedPriority] || PRIORITY_STYLES.medium}`}>
                          {gap.suggestedPriority}
                        </span>
                        <span className="text-sm font-medium">{gap.area}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{gap.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Render recommendations */}
              {analysisResult.result?.recommendations?.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-xs font-semibold uppercase text-gray-400 mb-2">Recommendations</h5>
                  <ul className="space-y-1">
                    {analysisResult.result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-brand-500 mt-0.5">&#8226;</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Render risks */}
              {analysisResult.result?.risks?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase text-gray-400">Risks</h5>
                  {analysisResult.result.risks.map((risk, i) => (
                    <div key={i} className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-red-500" />
                        <span className="text-sm font-medium">{risk.area}</span>
                        <span className="badge bg-red-100 text-red-700 text-[10px]">{risk.riskLevel}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{risk.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Render duplicates */}
              {analysisResult.result?.duplicates?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase text-gray-400">Duplicates</h5>
                  {analysisResult.result.duplicates.map((dup, i) => (
                    <div key={i} className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                      <p className="text-sm font-medium">{dup.reason}</p>
                      <p className="text-sm text-gray-600 mt-1">{dup.mergeRecommendation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Render issues (quality review) */}
              {analysisResult.result?.issues?.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-semibold uppercase text-gray-400">Issues</h5>
                  {analysisResult.result.issues.map((issue, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <span className="text-sm font-medium">{issue.issue}</span>
                      <p className="text-sm text-gray-600 mt-1">{issue.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create test case modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add Test Case</h2>
            <form onSubmit={handleCreateTestCase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input"
                  placeholder="E.g. Valid card checkout"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Test Steps / Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="input font-mono text-sm resize-none"
                  rows={6}
                  placeholder={"Step 1: Navigate to checkout\nStep 2: Enter payment details\nStep 3: Click submit\nExpected: Order confirmation displayed"}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high', 'critical'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPriority(p)}
                      className={`badge cursor-pointer capitalize px-3 py-1.5 ${
                        newPriority === p ? PRIORITY_STYLES[p] : 'bg-gray-50 text-gray-400'
                      } transition-colors`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  Add Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test cases list */}
      {testCases.length === 0 ? (
        <div className="text-center py-20">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No test cases yet</h3>
          <p className="text-gray-400 text-sm mb-6">Add your first test case to this project</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} />
            Add Test Case
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {testCases.map((tc) => (
            <div
              key={tc.id}
              className={`card p-4 transition-all ${
                selectedIds.includes(tc.id) ? 'border-brand-400 bg-brand-50/30 shadow-sm' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {showAnalyze && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(tc.id)}
                      onChange={() => toggleSelect(tc.id)}
                      className="mt-1 w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{tc.title}</h3>
                      <span className={`badge text-[10px] ${PRIORITY_STYLES[tc.priority]}`}>
                        {tc.priority}
                      </span>
                      <select
                        value={tc.status}
                        onChange={(e) => handleStatusChange(tc.id, e.target.value)}
                        className={`badge text-[10px] cursor-pointer border-0 appearance-none pr-5 ${STATUS_STYLES[tc.status]}`}
                        style={{ backgroundImage: 'none' }}
                      >
                        {Object.keys(STATUS_STYLES).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                      {tc.content}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTestCase(tc.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
