import { useState, useRef, useEffect } from 'react';
import {
  X, Plus, Sparkles, Folder, GripVertical, Upload, Loader2,
  Settings2, CheckSquare, Minus, FileText,
} from 'lucide-react';
import { api } from '../services/api';

// Parse the markdown content produced by buildContent() back into structured fields.
function parseContent(content) {
  const out = { description: '', preconditions: '', steps: [] };
  if (!content || typeof content !== 'string') return out;
  const lines = content.split(/\r?\n/);
  let section = null;
  const buckets = { description: [], preconditions: [] };
  const stepEntries = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const h = /^##\s+(.+)/.exec(line);
    if (h) {
      const title = h[1].trim().toLowerCase();
      if (title.startsWith('description')) section = 'description';
      else if (title.startsWith('precondition')) section = 'preconditions';
      else if (title.startsWith('step')) section = 'steps';
      else section = null;
      current = null;
      continue;
    }
    if (!section) continue;
    if (section === 'steps') {
      const m = /^(\d+)\.\s+(.*)$/.exec(line);
      if (m) {
        if (current) stepEntries.push(current);
        current = { step: m[2], result: '' };
        continue;
      }
      const e = /^\s+(?:→\s*)?Expected:\s*(.*)$/i.exec(line);
      if (e && current) { current.result = e[1]; continue; }
      if (current && line.trim()) current.step += '\n' + line.trim();
    } else {
      buckets[section].push(line);
    }
  }
  if (current) stepEntries.push(current);
  out.description = buckets.description.join('\n').trim();
  out.preconditions = buckets.preconditions.join('\n').trim();
  out.steps = stepEntries;
  return out;
}

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'text-red-600' },
  { value: 'high',     label: 'High',     color: 'text-orange-600' },
  { value: 'medium',   label: 'Medium',   color: 'text-amber-600' },
  { value: 'low',      label: 'Low',      color: 'text-surface-500' },
];

const STATES = ['Active', 'Draft', 'Deprecated'];
const TYPES = ['Functional', 'Regression', 'Smoke', 'Integration', 'UI', 'API', 'Other'];
const AUTOMATION = ['Not Automated', 'Automated', 'To Automate', 'Cannot Automate'];
const TEMPLATES = ['Test Case Steps', 'Exploratory', 'BDD / Gherkin'];

function Select({ value, onChange, options, icon, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="input w-full appearance-none pr-8 text-sm"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-surface-400" width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

function LabeledField({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-surface-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function CreateTestCaseModal({ folderName, onClose, onSubmit, editingCase, projectId }) {
  const isEdit = !!editingCase;
  const initial = isEdit ? parseContent(editingCase.content) : { description: '', preconditions: '', steps: [] };
  const [title, setTitle] = useState(editingCase?.title || '');
  const [showDescription, setShowDescription] = useState(!!initial.description);
  const [description, setDescription] = useState(initial.description || '');
  const [preconditions, setPreconditions] = useState(initial.preconditions || '');
  const [template, setTemplate] = useState('Test Case Steps');
  const [steps, setSteps] = useState(() => {
    if (isEdit && initial.steps.length > 0) {
      return initial.steps.map((s, i) => ({ id: i + 1, step: s.step || '', result: s.result || '' }));
    }
    return [{ id: 1, step: '', result: '' }];
  });
  const [attachments, setAttachments] = useState([]);
  const [createAnother, setCreateAnother] = useState(false);
  const [assigneeUserId, setAssigneeUserId] = useState(editingCase?.assigneeUserId || '');
  const [members, setMembers] = useState([]);

  // Sidebar fields
  const [owner, setOwner] = useState('Myself (Tonmoy Malakar)');
  const [state, setState] = useState('Active');
  const [priority, setPriority] = useState(editingCase?.priority || 'medium');
  const [type, setType] = useState('Other');
  const [productArea, setProductArea] = useState('');
  const [automationStatus, setAutomationStatus] = useState('Not Automated');
  const [testCaseRef, setTestCaseRef] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [scenario, setScenario] = useState('');
  const [requirements, setRequirements] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileRef = useRef(null);
  const nextStepId = useRef((steps[steps.length - 1]?.id || 1) + 1);

  useEffect(() => {
    api.listAssignableMembers().then((r) => setMembers(r?.members || [])).catch(() => {});
  }, []);

  const addStep = () => {
    setSteps((prev) => [...prev, { id: nextStepId.current++, step: '', result: '' }]);
  };
  const removeStep = (id) => {
    setSteps((prev) => prev.length > 1 ? prev.filter((s) => s.id !== id) : prev);
  };
  const updateStep = (id, key, val) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: val } : s)));
  };

  const addTagFromInput = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const MAX = 50 * 1024 * 1024;
    const accepted = files.filter((f) => f.size <= MAX).slice(0, 10);
    setAttachments((prev) => [...prev, ...accepted].slice(0, 10));
  };

  const buildContent = () => {
    const lines = [];
    if (description.trim()) { lines.push('## Description', description.trim(), ''); }
    if (preconditions.trim()) { lines.push('## Preconditions', preconditions.trim(), ''); }
    lines.push('## Steps');
    steps.forEach((s, i) => {
      const st = (s.step || '').trim() || '(empty step)';
      const rs = (s.result || '').trim() || '(no expected result)';
      lines.push(`${i + 1}. ${st}`);
      lines.push(`   → Expected: ${rs}`);
    });
    lines.push('');
    const meta = [];
    if (type) meta.push(`- Type: ${type}`);
    if (state) meta.push(`- State: ${state}`);
    if (automationStatus) meta.push(`- Automation: ${automationStatus}`);
    if (productArea) meta.push(`- Product Area: ${productArea}`);
    if (scenario.trim()) meta.push(`- Scenario: ${scenario.trim()}`);
    if (testCaseRef.trim()) meta.push(`- Test Case Ref: ${testCaseRef.trim()}`);
    if (tags.length) meta.push(`- Tags: ${tags.join(', ')}`);
    if (requirements.trim()) meta.push(`- Requirements: ${requirements.trim()}`);
    if (owner) meta.push(`- Owner: ${owner}`);
    if (template) meta.push(`- Template: ${template}`);
    if (attachments.length) meta.push(`- Attachments: ${attachments.map((a) => a.name).join(', ')}`);
    if (meta.length) { lines.push('## Metadata', ...meta); }
    return lines.join('\n');
  };

  const resetForNext = () => {
    setTitle(''); setDescription(''); setShowDescription(false);
    setPreconditions('');
    setSteps([{ id: nextStepId.current++, step: '', result: '' }]);
    setAttachments([]); setTags([]); setTagInput('');
    setScenario(''); setRequirements(''); setTestCaseRef('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!title.trim()) { setErrorMsg('Title is required'); return; }
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        content: buildContent(),
        priority,
        assigneeUserId: assigneeUserId ? Number(assigneeUserId) : null,
      }, { keepOpen: createAnother && !isEdit });
      if (!isEdit && createAnother) resetForNext();
    } catch (err) {
      setErrorMsg(err?.message || (isEdit ? 'Failed to save test case' : 'Failed to create test case'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-soft-lg w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/70">
          <h2 className="text-lg font-semibold text-surface-900">{isEdit ? 'Edit Test Case' : 'Create Test Case'}</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close"><X size={18} /></button>
        </div>

        {errorMsg && (
          <div className="px-6 pt-3">
            <div role="alert" className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md border border-red-200">{errorMsg}</div>
          </div>
        )}

        {/* Body: two columns */}
        <form onSubmit={handleSubmit} className="flex-1 flex min-h-0">
          {/* Left column */}
          <div className="flex-1 overflow-y-auto px-6 py-5 border-r border-surface-200/70">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8">
                <LabeledField label="Title" required>
                  <div className="flex gap-2">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter test case name"
                      className="input flex-1"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-10 rounded-md bg-gradient-to-br from-brand-500 to-indigo-500 text-white hover:opacity-90"
                      title="Generate title with AI"
                    >
                      <Sparkles size={15} />
                    </button>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-surface-500">
                    <Folder size={12} className="text-amber-500" />
                    <span>{folderName || 'Unassigned'}</span>
                  </div>
                  {!showDescription ? (
                    <button
                      type="button"
                      onClick={() => setShowDescription(true)}
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-2"
                    >
                      <Plus size={14} /> Add Description
                    </button>
                  ) : (
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="input mt-2 text-sm"
                      rows={3}
                      placeholder="Describe what this test case verifies"
                    />
                  )}
                </LabeledField>
              </div>
              <div className="col-span-4">
                <LabeledField label="Template">
                  <Select value={template} onChange={setTemplate} options={TEMPLATES} />
                </LabeledField>
              </div>
            </div>

            <div className="mt-5">
              <LabeledField label="Preconditions">
                <textarea
                  value={preconditions}
                  onChange={(e) => setPreconditions(e.target.value)}
                  placeholder="Define any preconditions about the test"
                  className="input text-sm min-h-[110px]"
                  rows={4}
                />
              </LabeledField>
            </div>

            {/* Datasets */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-1">Datasets</h3>
              <p className="text-xs text-surface-500">
                No datasets defined (
                <button type="button" className="text-brand-600 hover:underline">Create Dataset</button>
                {' '}or{' '}
                <button type="button" className="text-brand-600 hover:underline">Import value from a dataset</button>
                )
              </p>
            </div>

            {/* Steps and Results */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-3">Steps and Results</h3>
              <div className="space-y-3">
                {steps.map((s, idx) => (
                  <div key={s.id} className="flex gap-2 items-start">
                    <div className="flex flex-col items-center gap-1 pt-2 shrink-0 w-6">
                      <GripVertical size={14} className="text-surface-300" />
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-surface-300 text-[11px] font-semibold text-surface-600">{idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div>
                        <div className="text-[11px] font-medium text-surface-600 mb-1">Step</div>
                        <textarea
                          value={s.step}
                          onChange={(e) => updateStep(s.id, 'step', e.target.value)}
                          placeholder="Details of the step"
                          className="input text-sm min-h-[90px]"
                          rows={3}
                        />
                      </div>
                      <div>
                        <div className="text-[11px] font-medium text-surface-600 mb-1">Result</div>
                        <textarea
                          value={s.result}
                          onChange={(e) => updateStep(s.id, 'result', e.target.value)}
                          placeholder="Expected Result"
                          className="input text-sm min-h-[90px]"
                          rows={3}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStep(s.id)}
                      disabled={steps.length === 1}
                      className="icon-btn mt-7 shrink-0 disabled:opacity-30"
                      aria-label="Remove step"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={addStep} className="btn-secondary btn-sm bg-brand-50 text-brand-700 border-brand-100 hover:bg-brand-100">
                  <Plus size={14} /> Add Step
                </button>
                <button type="button" className="btn-secondary btn-sm">
                  <FileText size={14} /> Add Shared Step
                </button>
              </div>
            </div>

            {/* Attachments */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-surface-900 mb-2">Attachments</h3>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={onFiles} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-secondary btn-sm"
              >
                <Upload size={14} /> Upload Files
              </button>
              <p className="text-xs text-surface-500 mt-1">
                Max. file size: 50 MB | Max. files: 10 (per upload)
              </p>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {attachments.map((f, i) => (
                    <li key={i} className="text-xs text-surface-700 flex items-center justify-between bg-surface-50 px-2 py-1 rounded">
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                        className="icon-btn w-5 h-5"
                        aria-label="Remove file"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column (sidebar) */}
          <aside className="w-[320px] shrink-0 overflow-y-auto bg-surface-50/50 px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-surface-900">Test Case Fields</h3>
              <button type="button" className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700">
                <Settings2 size={13} /> Configure
              </button>
            </div>

            <div className="space-y-3.5">
              <LabeledField label="Owner" required>
                <Select value={owner} onChange={setOwner} options={[owner]} />
              </LabeledField>

              <LabeledField label="Assignee">
                <select
                  value={assigneeUserId || ''}
                  onChange={(e) => setAssigneeUserId(e.target.value)}
                  className="input w-full text-sm"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.displayName || m.email}</option>
                  ))}
                </select>
              </LabeledField>

              <LabeledField label="State" required>
                <div className="relative">
                  <CheckSquare size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-600 pointer-events-none" />
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="input w-full appearance-none pl-8 pr-8 text-sm"
                  >
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </LabeledField>

              <LabeledField label="Priority" required>
                <div className="relative">
                  <Minus size={14} className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${PRIORITIES.find((p) => p.value === priority)?.color}`} />
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="input w-full appearance-none pl-8 pr-8 text-sm capitalize"
                  >
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </LabeledField>

              <LabeledField label="Type of Test Case" required>
                <Select value={type} onChange={setType} options={TYPES} />
              </LabeledField>

              <LabeledField label="Product Area">
                <input
                  value={productArea}
                  onChange={(e) => setProductArea(e.target.value)}
                  placeholder="Search for Options"
                  className="input text-sm"
                />
              </LabeledField>

              <LabeledField label="Automation Status" required>
                <Select value={automationStatus} onChange={setAutomationStatus} options={AUTOMATION} />
              </LabeledField>

              <LabeledField label="Test Case">
                <input
                  value={testCaseRef}
                  onChange={(e) => setTestCaseRef(e.target.value)}
                  placeholder="Test Case"
                  className="input text-sm"
                />
              </LabeledField>

              <LabeledField label="Tags">
                <div className="input text-sm flex flex-wrap gap-1 min-h-[34px] items-center">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 rounded px-1.5 py-0.5 text-xs">
                      {t}
                      <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagFromInput(); }
                      else if (e.key === 'Backspace' && !tagInput && tags.length) {
                        setTags((prev) => prev.slice(0, -1));
                      }
                    }}
                    onBlur={addTagFromInput}
                    placeholder={tags.length ? '' : 'Add tags and hit ↵'}
                    className="flex-1 min-w-[80px] outline-none bg-transparent"
                  />
                </div>
              </LabeledField>

              <LabeledField label="Scenario">
                <input
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="Scenario"
                  className="input text-sm"
                />
              </LabeledField>

              <LabeledField label="Requirements">
                <div className="flex items-center justify-between mb-1 -mt-1">
                  <span className="sr-only">Requirements</span>
                  <span className="inline-flex items-center gap-1 text-xs text-brand-600 ml-auto">
                    <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" /> Jira
                  </span>
                </div>
                <input
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Select options"
                  className="input text-sm"
                />
                <p className="text-xs text-surface-500 mt-1">
                  To create new Jira requirements,{' '}
                  <button type="button" className="text-brand-600 hover:underline">click here</button>
                </p>
              </LabeledField>

              <div>
                <p className="text-xs text-surface-500 mb-1.5">You can link your other tools with your test cases as references:</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary btn-sm text-xs">Confluence</button>
                  <button type="button" className="btn-secondary btn-sm text-xs">Figma</button>
                </div>
              </div>
            </div>
          </aside>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-surface-200/70 bg-white">
          {!isEdit ? (
            <label className="inline-flex items-center gap-2 text-sm text-surface-700 cursor-pointer">
              <input
                type="checkbox"
                checked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
                className="rounded border-surface-300"
              />
              Create another
            </label>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
