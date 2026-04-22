import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Play, Loader2, Monitor, Globe, Plus, Trash2, Lock, Sparkles,
  CheckCircle2, XCircle, X
} from 'lucide-react';
import ResponseViewer from '../components/ResponseViewer';

const UI_ACTIONS = [
  { value: 'navigate', label: 'Navigate to URL', needsValue: true, needsSelector: false },
  { value: 'click', label: 'Click element', needsValue: false, needsSelector: true },
  { value: 'fill', label: 'Fill input', needsValue: true, needsSelector: true },
  { value: 'assert_text', label: 'Assert text contains', needsValue: true, needsSelector: true },
  { value: 'assert_visible', label: 'Assert element visible', needsValue: false, needsSelector: true },
  { value: 'assert_title', label: 'Assert page title', needsValue: true, needsSelector: false },
  { value: 'assert_url', label: 'Assert URL contains', needsValue: true, needsSelector: false },
  { value: 'screenshot', label: 'Take screenshot', needsValue: false, needsSelector: false },
  { value: 'wait', label: 'Wait (ms)', needsValue: true, needsSelector: false },
];

const API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const METHOD_COLORS = {
  GET:    'text-emerald-700 bg-emerald-50 ring-emerald-600/15',
  POST:   'text-brand-700    bg-brand-50    ring-brand-600/15',
  PUT:    'text-amber-700   bg-amber-50   ring-amber-600/15',
  PATCH:  'text-purple-700  bg-purple-50  ring-purple-600/15',
  DELETE: 'text-red-700     bg-red-50     ring-red-600/15',
};
const ASSERTION_TARGETS = ['status', 'body', 'header', 'response_time'];
const ASSERTION_OPERATORS = ['equals', 'contains', 'greater_than', 'less_than', 'exists', 'matches'];

export default function RunTestPage() {
  const [testType, setTestType] = useState('ui');
  const [testName, setTestName] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('params');

  const [url, setUrl] = useState('');
  const [steps, setSteps] = useState([{ action: 'navigate', selector: '', value: '' }]);

  const [apiMethod, setApiMethod] = useState('GET');
  const [apiUrl, setApiUrl] = useState('');
  const [apiBody, setApiBody] = useState('');

  const [authType, setAuthType] = useState('none');
  const [bearerToken, setBearerToken] = useState('');
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyLocation, setApiKeyLocation] = useState('header');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');

  const [headers, setHeaders] = useState([]);
  const [queryParams, setQueryParams] = useState([]);
  const [assertions, setAssertions] = useState([{ target: 'status', operator: 'equals', expected: '200', path: '' }]);

  const addStep = () => setSteps([...steps, { action: 'click', selector: '', value: '' }]);
  const removeStep = (i) => { if (steps.length > 1) setSteps(steps.filter((_, idx) => idx !== i)); };
  const updateStep = (i, field, val) => { const u = [...steps]; u[i] = { ...u[i], [field]: val }; setSteps(u); };

  const addAssertion = () => setAssertions([...assertions, { target: 'status', operator: 'equals', expected: '', path: '' }]);
  const removeAssertion = (i) => { if (assertions.length > 1) setAssertions(assertions.filter((_, idx) => idx !== i)); };
  const updateAssertion = (i, field, val) => { const u = [...assertions]; u[i] = { ...u[i], [field]: val }; setAssertions(u); };

  const addHeader = () => setHeaders([...headers, { key: '', value: '', enabled: true }]);
  const removeHeader = (i) => setHeaders(headers.filter((_, idx) => idx !== i));
  const updateHeader = (i, field, val) => { const u = [...headers]; u[i] = { ...u[i], [field]: val }; setHeaders(u); };

  const addParam = () => setQueryParams([...queryParams, { key: '', value: '', enabled: true }]);
  const removeParam = (i) => setQueryParams(queryParams.filter((_, idx) => idx !== i));
  const updateParam = (i, field, val) => { const u = [...queryParams]; u[i] = { ...u[i], [field]: val }; setQueryParams(u); };

  const buildHeaders = () => {
    const h = {};
    headers.filter((hd) => hd.enabled && hd.key).forEach((hd) => { h[hd.key] = hd.value; });
    switch (authType) {
      case 'bearer':  if (bearerToken) h['Authorization'] = 'Bearer ' + bearerToken; break;
      case 'api_key': if (apiKeyLocation === 'header' && apiKeyName && apiKeyValue) h[apiKeyName] = apiKeyValue; break;
      case 'basic':   if (basicUsername) h['Authorization'] = 'Basic ' + btoa(basicUsername + ':' + basicPassword); break;
    }
    return Object.keys(h).length > 0 ? h : undefined;
  };

  const buildUrl = () => {
    let finalUrl = apiUrl;
    const enabled = [...queryParams.filter((p) => p.enabled && p.key)];
    if (authType === 'api_key' && apiKeyLocation === 'query' && apiKeyName && apiKeyValue) enabled.push({ key: apiKeyName, value: apiKeyValue });
    if (enabled.length > 0) {
      const sep = finalUrl.includes('?') ? '&' : '?';
      finalUrl += sep + enabled.map((p) => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value)).join('&');
    }
    return finalUrl;
  };

  const buildTestDef = () => {
    if (testType === 'ui') {
      return {
        name: testName || 'Untitled UI Test', type: 'ui',
        config: { url, headless: true, steps: steps.map((s) => { const step = { action: s.action }; if (s.selector) step.selector = s.selector; if (s.value) step.value = s.value; return step; }) },
      };
    }
    let parsedBody;
    if (apiBody.trim()) { try { parsedBody = JSON.parse(apiBody); } catch { throw new Error('Invalid JSON body'); } }
    return {
      name: testName || 'Untitled API Test', type: 'api',
      config: {
        method: apiMethod, url: buildUrl(), headers: buildHeaders(), body: parsedBody, timeout: 10000,
        assertions: assertions.map((a) => ({
          target: a.target, operator: a.operator,
          expected: a.target === 'status' || a.target === 'response_time' ? Number(a.expected) : a.operator === 'exists' ? true : a.expected,
          ...(a.path ? { path: a.path } : {}),
        })),
      },
    };
  };

  const handleRun = async () => {
    setError(''); setResult(null); setRunning(true);
    try {
      const res = await api.request('POST', '/execute-test', { test: buildTestDef() });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed');
    } finally {
      setRunning(false);
    }
  };

  const loadExample = (type) => {
    if (type === 'ui') {
      setTestType('ui'); setTestName('Example.com Title Check'); setUrl('https://example.com');
      setSteps([
        { action: 'navigate', selector: '', value: 'https://example.com' },
        { action: 'assert_title', selector: '', value: 'Example Domain' },
        { action: 'assert_visible', selector: 'h1', value: '' },
        { action: 'screenshot', selector: '', value: '' },
      ]);
    } else {
      setTestType('api'); setTestName('JSONPlaceholder — Get user'); setApiMethod('GET');
      setApiUrl('https://jsonplaceholder.typicode.com/users/1');
      setApiBody(''); setAuthType('none'); setHeaders([]); setQueryParams([]);
      setAssertions([
        { target: 'status', operator: 'equals', expected: '200', path: '' },
        { target: 'body', operator: 'equals', expected: 'Leanne Graham', path: 'name' },
        { target: 'response_time', operator: 'less_than', expected: '5000', path: '' },
      ]);
    }
  };

  const canRun = testType === 'ui' ? !!url : !!apiUrl;

  return (
    <div className="page max-w-[1100px]">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Run a test</h1>
          <p className="page-subtitle">Author a UI or API test and execute it live.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadExample('ui')}  className="btn-ghost btn-sm"><Sparkles size={13} /> UI example</button>
          <button onClick={() => loadExample('api')} className="btn-ghost btn-sm"><Sparkles size={13} /> API example</button>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={16} /></button>
        </div>
      )}

      {/* Type + name */}
      <div className="card p-5 mb-4">
        <div className="inline-flex p-1 rounded-lg bg-surface-100 mb-4">
          <button
            onClick={() => setTestType('ui')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${testType === 'ui' ? 'bg-white text-surface-900 shadow-soft' : 'text-surface-500 hover:text-surface-800'}`}
            aria-pressed={testType === 'ui'}
          >
            <Monitor size={15} /> UI Test
          </button>
          <button
            onClick={() => setTestType('api')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${testType === 'api' ? 'bg-white text-surface-900 shadow-soft' : 'text-surface-500 hover:text-surface-800'}`}
            aria-pressed={testType === 'api'}
          >
            <Globe size={15} /> API Test
          </button>
        </div>
        <label htmlFor="test-name" className="label">Test name</label>
        <input id="test-name" value={testName} onChange={(e) => setTestName(e.target.value)} className="input" placeholder="Give it a memorable name (optional)" />
      </div>

      {/* UI */}
      {testType === 'ui' && (
        <div className="card p-5 mb-4">
          <label htmlFor="target-url" className="label">Target URL</label>
          <input id="target-url" value={url} onChange={(e) => setUrl(e.target.value)} className="input mb-5" placeholder="https://example.com" />

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-surface-800">Steps</h3>
            <button onClick={addStep} className="btn-ghost btn-xs"><Plus size={13} /> Add step</button>
          </div>

          <ol className="space-y-2">
            {steps.map((step, i) => {
              const def = UI_ACTIONS.find((a) => a.value === step.action);
              return (
                <li key={i} className="flex gap-3 items-start bg-surface-50/60 rounded-lg p-3 ring-1 ring-surface-200/60">
                  <span className="w-6 h-6 rounded-full bg-white border border-surface-200 text-[11px] font-semibold text-surface-500 flex items-center justify-center mt-1 shrink-0">{i + 1}</span>
                  <div className="flex-1 space-y-2">
                    <select value={step.action} onChange={(e) => updateStep(i, 'action', e.target.value)} className="input input-sm py-1.5">
                      {UI_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                    {def?.needsSelector && (
                      <input value={step.selector} onChange={(e) => updateStep(i, 'selector', e.target.value)} className="input input-sm py-1.5 font-mono" placeholder="CSS selector (e.g. button.submit)" />
                    )}
                    {def?.needsValue && (
                      <input value={step.value} onChange={(e) => updateStep(i, 'value', e.target.value)} className="input input-sm py-1.5" placeholder={step.action === 'wait' ? 'Milliseconds' : 'Value'} />
                    )}
                  </div>
                  <button onClick={() => removeStep(i)} disabled={steps.length === 1} className="icon-btn hover:text-red-500 mt-0.5 disabled:opacity-30" aria-label="Remove step">
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* API */}
      {testType === 'api' && (
        <>
          <div className="card p-5 mb-4">
            <div className="flex gap-2 mb-4">
              <select
                value={apiMethod}
                onChange={(e) => setApiMethod(e.target.value)}
                className={`input input-sm w-28 font-mono font-semibold ring-1 ring-inset ${METHOD_COLORS[apiMethod]}`}
                aria-label="HTTP method"
              >
                {API_METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="input input-sm flex-1 font-mono" placeholder="https://api.example.com/endpoint" />
            </div>

            <div className="tabs mb-4">
              {['params', 'auth', 'headers', 'body'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`tab capitalize ${activeTab === tab ? 'tab-active' : ''}`}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'params' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-surface-600">Query parameters</span>
                  <button onClick={addParam} className="btn-ghost btn-xs"><Plus size={12} /> Add</button>
                </div>
                {queryParams.length === 0 ? (
                  <p className="text-xs text-surface-400 text-center py-6">No query parameters</p>
                ) : (
                  <div className="space-y-2">
                    {queryParams.map((p, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="checkbox" checked={p.enabled} onChange={(e) => updateParam(i, 'enabled', e.target.checked)} className="rounded border-surface-300 text-brand-600" />
                        <input value={p.key} onChange={(e) => updateParam(i, 'key', e.target.value)} className="input input-sm flex-1 font-mono" placeholder="Key" />
                        <input value={p.value} onChange={(e) => updateParam(i, 'value', e.target.value)} className="input input-sm flex-1 font-mono" placeholder="Value" />
                        <button onClick={() => removeParam(i)} className="icon-btn hover:text-red-500" aria-label="Remove parameter"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'auth' && (
              <div className="space-y-3">
                <select value={authType} onChange={(e) => setAuthType(e.target.value)} className="input input-sm w-48">
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="api_key">API Key</option>
                  <option value="basic">Basic Auth</option>
                </select>

                {authType === 'none' && (
                  <div className="flex items-center gap-3 py-6 justify-center text-surface-400">
                    <Lock size={18} />
                    <span className="text-sm">No authentication will be sent with this request.</span>
                  </div>
                )}

                {authType === 'bearer' && (
                  <div className="bg-surface-50 rounded-lg p-4 ring-1 ring-surface-200/60">
                    <label className="label">Token</label>
                    <input value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} className="input input-sm font-mono" placeholder="eyJhbG..." />
                  </div>
                )}

                {authType === 'api_key' && (
                  <div className="bg-surface-50 rounded-lg p-4 ring-1 ring-surface-200/60 space-y-3">
                    <div><label className="label">Key name</label><input value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} className="input input-sm font-mono" placeholder="X-API-Key" /></div>
                    <div><label className="label">Key value</label><input type="password" value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} className="input input-sm font-mono" placeholder="your-key" /></div>
                    <div className="inline-flex p-1 rounded-lg bg-white ring-1 ring-surface-200">
                      <button type="button" onClick={() => setApiKeyLocation('header')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${apiKeyLocation === 'header' ? 'bg-brand-50 text-brand-700' : 'text-surface-500'}`}>Header</button>
                      <button type="button" onClick={() => setApiKeyLocation('query')} className={`px-3 py-1.5 rounded-md text-xs font-medium ${apiKeyLocation === 'query' ? 'bg-brand-50 text-brand-700' : 'text-surface-500'}`}>Query param</button>
                    </div>
                  </div>
                )}

                {authType === 'basic' && (
                  <div className="bg-surface-50 rounded-lg p-4 ring-1 ring-surface-200/60 space-y-3">
                    <div><label className="label">Username</label><input value={basicUsername} onChange={(e) => setBasicUsername(e.target.value)} className="input input-sm" /></div>
                    <div><label className="label">Password</label><input type="password" value={basicPassword} onChange={(e) => setBasicPassword(e.target.value)} className="input input-sm" /></div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'headers' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-surface-600">Custom headers</span>
                  <button onClick={addHeader} className="btn-ghost btn-xs"><Plus size={12} /> Add</button>
                </div>
                {headers.length === 0 ? (
                  <p className="text-xs text-surface-400 text-center py-6">No custom headers</p>
                ) : (
                  <div className="space-y-2">
                    {headers.map((h, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="checkbox" checked={h.enabled} onChange={(e) => updateHeader(i, 'enabled', e.target.checked)} className="rounded border-surface-300 text-brand-600" />
                        <input value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} className="input input-sm flex-1 font-mono" placeholder="Header name" />
                        <input value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} className="input input-sm flex-1 font-mono" placeholder="Value" />
                        <button onClick={() => removeHeader(i)} className="icon-btn hover:text-red-500" aria-label="Remove header"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'body' && (
              ['GET', 'DELETE'].includes(apiMethod)
                ? <p className="text-xs text-surface-400 text-center py-6">{apiMethod} requests don't have a body.</p>
                : <div>
                    <label className="label">JSON body</label>
                    <textarea value={apiBody} onChange={(e) => setApiBody(e.target.value)} className="input font-mono text-sm resize-none" rows={8} placeholder={'{\n  "key": "value"\n}'} />
                  </div>
            )}
          </div>

          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-surface-800">Assertions</h3>
              <button onClick={addAssertion} className="btn-ghost btn-xs"><Plus size={13} /> Add</button>
            </div>
            <div className="space-y-2">
              {assertions.map((a, i) => (
                <div key={i} className="flex gap-2 items-start bg-surface-50/60 rounded-lg p-3 ring-1 ring-surface-200/60">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <select value={a.target} onChange={(e) => updateAssertion(i, 'target', e.target.value)} className="input input-sm">{ASSERTION_TARGETS.map((t) => <option key={t}>{t}</option>)}</select>
                    <select value={a.operator} onChange={(e) => updateAssertion(i, 'operator', e.target.value)} className="input input-sm">{ASSERTION_OPERATORS.map((o) => <option key={o}>{o}</option>)}</select>
                    {(a.target === 'body' || a.target === 'header') && (
                      <input value={a.path} onChange={(e) => updateAssertion(i, 'path', e.target.value)} className="input input-sm font-mono" placeholder="JSON path (e.g. data.name)" />
                    )}
                    <input value={a.expected} onChange={(e) => updateAssertion(i, 'expected', e.target.value)} className="input input-sm" placeholder="Expected value" />
                  </div>
                  <button onClick={() => removeAssertion(i)} disabled={assertions.length === 1} className="icon-btn hover:text-red-500 mt-0.5 disabled:opacity-30" aria-label="Remove assertion">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Run bar */}
      <div className="sticky bottom-4 z-20 mt-6 card p-3 shadow-soft-lg ring-1 ring-brand-600/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-surface-500 min-w-0">
          {canRun
            ? <><CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> <span className="truncate">Ready to run</span></>
            : <><XCircle size={15} className="text-surface-300 shrink-0" /> <span className="truncate">Enter a {testType === 'ui' ? 'target URL' : 'request URL'} to continue</span></>}
        </div>
        <button onClick={handleRun} disabled={running || !canRun} className="btn-primary btn-lg">
          {running ? <><Loader2 size={18} className="animate-spin" /> Running…</> : <><Play size={18} /> Run test</>}
        </button>
      </div>

      {/* Result */}
      {running && (
        <div className="card p-10 text-center mt-6">
          <Loader2 size={32} className="mx-auto text-brand-500 animate-spin mb-3" />
          <p className="text-sm text-surface-500">Executing your test…</p>
        </div>
      )}

      {result && (
        <div className="mt-6 animate-fade-in">
          <ResponseViewer result={result} />
          {result.id && (
            <Link to={'/executions/' + result.id} className="btn-secondary w-full justify-center mt-4">
              View full execution details
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
