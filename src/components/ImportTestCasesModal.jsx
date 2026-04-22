import { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const PRIORITY_MAP = {
  critical: 'critical', p0: 'critical', '1 - critical': 'critical', '1': 'critical',
  high: 'high', p1: 'high', '2 - high': 'high', '2': 'high',
  medium: 'medium', p2: 'medium', '3 - medium': 'medium', '3': 'medium', normal: 'medium',
  low: 'low', p3: 'low', '4 - low': 'low', '4': 'low', minor: 'low',
};

// Simple RFC-4180 CSV parser: handles quoted fields, escaped quotes, commas, newlines in quotes.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f && f.trim() !== ''));
}

function normKey(k) { return String(k || '').toLowerCase().trim().replace(/[\s_-]+/g, ''); }

// Map BrowserStack / generic CSV headers to our canonical test case fields.
const HEADER_ALIASES = {
  title: ['title', 'name', 'testcasename', 'testcasetitle', 'summary'],
  preconditions: ['preconditions', 'precondition', 'prerequisites'],
  steps: ['steps', 'teststeps', 'stepstext', 'stepsandresults', 'stepdetails'],
  expected: ['expectedresult', 'expectedresults', 'result', 'results', 'expected'],
  priority: ['priority', 'prio'],
  tags: ['tags', 'labels'],
  type: ['type', 'typeoftestcase', 'testcasetype'],
  state: ['state', 'status'],
  owner: ['owner', 'assignee', 'createdby'],
  description: ['description', 'desc', 'details'],
  scenario: ['scenario'],
  automation: ['automationstatus', 'automation'],
  productarea: ['productarea', 'module', 'component'],
};

function resolveHeaderMap(headers) {
  const map = {};
  headers.forEach((h, idx) => {
    const nk = normKey(h);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(nk)) { map[field] = idx; break; }
    }
  });
  return map;
}

function rowToTestCase(row, map) {
  const get = (k) => (map[k] != null ? (row[map[k]] || '').trim() : '');
  const title = get('title');
  if (!title) return null;

  const lines = [];
  const desc = get('description');
  const pre = get('preconditions');
  const steps = get('steps');
  const expected = get('expected');
  if (desc) { lines.push('## Description', desc, ''); }
  if (pre) { lines.push('## Preconditions', pre, ''); }
  if (steps) {
    lines.push('## Steps');
    lines.push(steps);
    if (expected) { lines.push('', '## Expected', expected); }
    lines.push('');
  } else if (expected) {
    lines.push('## Expected', expected, '');
  }
  const meta = [];
  const type = get('type'); if (type) meta.push(`- Type: ${type}`);
  const state = get('state'); if (state) meta.push(`- State: ${state}`);
  const auto = get('automation'); if (auto) meta.push(`- Automation: ${auto}`);
  const area = get('productarea'); if (area) meta.push(`- Product Area: ${area}`);
  const scen = get('scenario'); if (scen) meta.push(`- Scenario: ${scen}`);
  const tags = get('tags'); if (tags) meta.push(`- Tags: ${tags}`);
  const owner = get('owner'); if (owner) meta.push(`- Owner: ${owner}`);
  if (meta.length) lines.push('## Metadata', ...meta);

  const rawPriority = normKey(get('priority'));
  const priority = PRIORITY_MAP[rawPriority] || 'medium';

  return { title, content: lines.join('\n') || title, priority };
}

function parseJson(text) {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : (data.testCases || data.test_cases || data.items || data.data || []);
  if (!Array.isArray(arr)) throw new Error('JSON must be an array of test cases');
  return arr.map((o) => {
    const title = o.title || o.name || o.summary;
    if (!title) return null;
    const content = o.content || o.steps || o.description || o.body || '';
    const rawPriority = normKey(o.priority);
    const priority = PRIORITY_MAP[rawPriority] || 'medium';
    return { title: String(title).trim(), content: String(content), priority };
  }).filter(Boolean);
}

export default function ImportTestCasesModal({ folderName, onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null); // { created, failed }
  const fileRef = useRef(null);

  const handleFile = async (f) => {
    setFile(f); setParsed([]); setParseError(''); setResult(null);
    if (!f) return;
    try {
      const text = await f.text();
      let cases = [];
      if (/\.json$/i.test(f.name)) {
        cases = parseJson(text);
      } else {
        const rows = parseCSV(text);
        if (rows.length < 2) throw new Error('CSV has no data rows');
        const [headers, ...body] = rows;
        const map = resolveHeaderMap(headers);
        if (map.title == null) {
          throw new Error(`Could not find a "Title" column. Detected columns: ${headers.join(', ')}`);
        }
        cases = body.map((r) => rowToTestCase(r, map)).filter(Boolean);
      }
      if (cases.length === 0) throw new Error('No valid test cases found in file');
      setParsed(cases);
    } catch (err) {
      setParseError(err.message || 'Failed to parse file');
    }
  };

  const handleImport = async () => {
    if (!parsed.length) return;
    setImporting(true);
    setProgress({ done: 0, total: parsed.length });
    const res = { created: 0, failed: 0, errors: [] };
    const CHUNK = 25;
    for (let i = 0; i < parsed.length; i += CHUNK) {
      const batch = parsed.slice(i, i + CHUNK);
      try {
        await onImport(batch);
        res.created += batch.length;
      } catch (err) {
        res.failed += batch.length;
        res.errors.push(err.message || 'Unknown error');
      }
      setProgress({ done: Math.min(i + CHUNK, parsed.length), total: parsed.length });
    }
    setResult(res);
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-soft-lg w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200/70">
          <h2 className="text-lg font-semibold text-surface-900">Import Test Cases</h2>
          <button onClick={onClose} className="icon-btn" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* BrowserStack guidance */}
          <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-surface-700">
            <div className="flex gap-2">
              <Info size={16} className="text-brand-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-surface-900">Importing from BrowserStack Test Management</p>
                <ol className="list-decimal ml-4 space-y-0.5 text-[13px]">
                  <li>In BrowserStack, open your project → Test Cases → <strong>Export</strong>.</li>
                  <li>Choose <strong>CSV</strong> (or JSON) format and download the file.</li>
                  <li>Upload the file below — columns like <em>Title</em>, <em>Preconditions</em>, <em>Steps</em>, <em>Expected Result</em>, <em>Priority</em>, <em>Tags</em> are auto-mapped.</li>
                </ol>
                <p className="text-[12px] text-surface-500 pt-0.5">TestRail, Zephyr, Xray, and generic CSV/JSON exports also work if they include a <code>Title</code> column.</p>
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="text-sm text-surface-600">
            <span className="font-medium text-surface-800">Destination folder:</span>{' '}
            {folderName ? folderName : 'Unassigned'}
          </div>

          {/* Uploader */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,.txt"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-surface-300 rounded-lg px-6 py-8 text-center hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
            >
              <Upload size={22} className="mx-auto text-surface-400 mb-2" />
              <div className="text-sm font-medium text-surface-800">
                {file ? file.name : 'Click to select a CSV or JSON file'}
              </div>
              <div className="text-xs text-surface-500 mt-1">Max file size 20 MB</div>
            </button>
          </div>

          {parseError && (
            <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-md">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> <span>{parseError}</span>
            </div>
          )}

          {parsed.length > 0 && !result && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-surface-900">Preview ({parsed.length} test case{parsed.length === 1 ? '' : 's'})</h3>
                <span className="text-xs text-surface-500">Showing first {Math.min(parsed.length, 5)}</span>
              </div>
              <div className="border border-surface-200 rounded-lg divide-y divide-surface-200 bg-white">
                {parsed.slice(0, 5).map((tc, i) => (
                  <div key={i} className="px-3 py-2 flex items-start gap-2 text-sm">
                    <FileText size={14} className="text-surface-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-surface-900 truncate">{tc.title}</div>
                      <div className="text-xs text-surface-500 truncate">{tc.content.replace(/\n+/g, ' · ').slice(0, 120)}</div>
                    </div>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-600 capitalize">{tc.priority}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importing && (
            <div className="text-sm text-surface-700">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 size={14} className="animate-spin text-brand-600" />
                Importing {progress.done} of {progress.total}…
              </div>
              <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
              </div>
            </div>
          )}

          {result && (
            <div className={`rounded-lg border px-4 py-3 text-sm ${result.failed === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 size={16} />
                Imported {result.created} test case{result.created === 1 ? '' : 's'}
                {result.failed > 0 && `, ${result.failed} failed`}
              </div>
              {result.errors?.length > 0 && (
                <ul className="list-disc ml-5 mt-1 text-xs">
                  {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-surface-200/70 bg-white">
          <button type="button" onClick={onClose} className="btn-secondary">{result ? 'Close' : 'Cancel'}</button>
          {!result && (
            <button
              type="button"
              onClick={handleImport}
              disabled={!parsed.length || importing}
              className="btn-primary"
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              Import {parsed.length || ''}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
