import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { ChevronRight, Paperclip, X, Search, Plus } from 'lucide-react';

function todayLabel() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export default function CreateTestRunPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState(`Test Run-${todayLabel()}`);
  const [description, setDescription] = useState('');
  const [state, setState] = useState('new');
  const [runGroup, setRunGroup] = useState('');
  const [testPlan, setTestPlan] = useState('');
  const [configurations, setConfigurations] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');
  const [autoAssign, setAutoAssign] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState([]);

  const [allCases, setAllCases] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => {
    const s = searchParams.get('caseIds');
    if (!s) return [];
    return s.split(',').map((x) => parseInt(x, 10)).filter(Boolean);
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [loadingCases, setLoadingCases] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoadingCases(true);
      try {
        const r = await api.getTestCases(projectId);
        setAllCases(Array.isArray(r) ? r : r?.data || []);
      } catch (e) {
        // ignore
      } finally {
        setLoadingCases(false);
      }
    })();
  }, [projectId]);

  const selectedCases = useMemo(
    () => allCases.filter((c) => selectedIds.includes(c.id)),
    [allCases, selectedIds]
  );

  const filteredCases = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return allCases;
    return allCases.filter((c) =>
      (c.title || '').toLowerCase().includes(q) ||
      (c.id + '').includes(q)
    );
  }, [allCases, pickerQuery]);

  function addTag() {
    const v = tagsInput.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setTagsInput('');
  }

  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  function toggleCase(id) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Test Run Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let configsObj = {};
      if (configurations.trim()) {
        try { configsObj = JSON.parse(configurations); }
        catch { configsObj = { notes: configurations }; }
      }
      const payload = {
        name: name.trim(),
        description: description || null,
        state,
        assigneeUserId: assigneeUserId ? parseInt(assigneeUserId, 10) : null,
        tags,
        testCaseIds: selectedIds,
        configurations: configsObj,
        runGroup: runGroup || null,
        testPlan: testPlan || null,
        autoAssign,
      };
      const created = await api.createTestRun(projectId, payload);
      navigate(`/projects/${projectId}/test-runs/${created.id}`);
    } catch (e) {
      setError(e?.message || 'Failed to create test run');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between mb-5">
        <nav className="flex items-center gap-1.5 text-sm text-surface-500">
          <Link to="/test-runs" className="hover:text-brand-600">Test Runs</Link>
          <ChevronRight size={14} />
          <span className="text-surface-900 font-medium">Create</span>
        </nav>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost"
            onClick={() => navigate('/test-runs')}
            disabled={saving}
          >Cancel</button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >{saving ? 'Creating…' : 'Create'}</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — main fields */}
        <div className="lg:col-span-2 space-y-5">
          <Field label="Test Run Name" required>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Test Run-MM/DD/YYYY"
            />
          </Field>

          <Field
            label="Test Cases"
            hint="Add test cases to be included in this run."
            action={
              <button
                type="button"
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                onClick={() => setPickerOpen((v) => !v)}
              >
                {pickerOpen ? 'Done' : selectedIds.length ? 'Edit' : 'Add'}
              </button>
            }
          >
            {selectedCases.length === 0 && !pickerOpen && (
              <div className="rounded-md border border-dashed border-surface-300 px-4 py-6 text-center text-sm text-surface-500">
                No test cases selected yet. Click <span className="font-medium text-brand-600">Add</span> to pick cases.
              </div>
            )}

            {selectedCases.length > 0 && (
              <div className="rounded-md border border-surface-200 divide-y divide-surface-100 mb-2">
                {selectedCases.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-surface-500 mr-2">#{c.id}</span>
                      <span className="text-surface-900 truncate">{c.title}</span>
                    </div>
                    <button
                      type="button"
                      className="text-surface-400 hover:text-red-500"
                      onClick={() => toggleCase(c.id)}
                      aria-label="Remove test case"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pickerOpen && (
              <div className="rounded-md border border-surface-200 bg-surface-50 p-3">
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    className="input w-full pl-7"
                    placeholder="Search test cases…"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-64 overflow-auto rounded bg-white border border-surface-200">
                  {loadingCases && (
                    <div className="p-3 text-xs text-surface-500">Loading…</div>
                  )}
                  {!loadingCases && filteredCases.length === 0 && (
                    <div className="p-3 text-xs text-surface-500">No test cases found.</div>
                  )}
                  {filteredCases.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-surface-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleCase(c.id)}
                      />
                      <span className="font-mono text-xs text-surface-500">#{c.id}</span>
                      <span className="truncate">{c.title}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-xs text-surface-500">
                  {selectedIds.length} selected
                </div>
              </div>
            )}
          </Field>

          <Field label="Run Group" hint="Group related runs together (e.g. Sprint-42).">
            <input
              className="input w-full"
              value={runGroup}
              onChange={(e) => setRunGroup(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Configurations" hint="Free-form JSON or notes (browsers, devices, env).">
            <textarea
              className="input w-full font-mono text-xs"
              rows={3}
              value={configurations}
              onChange={(e) => setConfigurations(e.target.value)}
              placeholder={'{ "browser": "chrome", "os": "mac" }'}
            />
          </Field>

          <Field label="Test Plan" hint="Link a test plan (optional).">
            <input
              className="input w-full"
              value={testPlan}
              onChange={(e) => setTestPlan(e.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Description">
            <textarea
              className="input w-full"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the goal or scope of this test run."
            />
          </Field>

          <Field label="Attachments" hint="Upload screenshots, logs, or docs (coming soon).">
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-surface-300 px-3 py-2 text-sm text-surface-500 cursor-not-allowed"
            >
              <Paperclip size={14} /> Add attachment
            </button>
          </Field>
        </div>

        {/* Right column — side fields */}
        <div className="space-y-5">
          <Field label="Assign Run">
            <input
              className="input w-full"
              placeholder="User ID (optional)"
              value={assigneeUserId}
              onChange={(e) => setAssigneeUserId(e.target.value)}
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-surface-700">
              <input
                type="checkbox"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
              />
              Auto-assign tests to run owner
            </label>
          </Field>

          <Field label="State">
            <select
              className="input w-full"
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </Field>

          <Field label="Tags">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                }}
                placeholder="Add tag and press Enter"
              />
              <button type="button" className="btn-ghost" onClick={addTag}>
                <Plus size={14} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 px-2 py-0.5 text-xs">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} aria-label="Remove tag">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label="Requirements" hint="Linking to Jira issues coming soon.">
            <div className="rounded-md border border-dashed border-surface-300 px-3 py-4 text-center text-xs text-surface-500">
              No requirements linked
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, action, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-surface-800">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {action}
      </div>
      {children}
      {hint && <p className="mt-1 text-xs text-surface-500">{hint}</p>}
    </div>
  );
}
