import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Play, Loader2, Monitor, Globe, Plus, Trash2,
  Image, Key, Lock, Shield
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
      case 'bearer': if (bearerToken) h['Authorization'] = 'Bearer ' + bearerToken; break;
      case 'api_key': if (apiKeyLocation === 'header' && apiKeyName && apiKeyValue) h[apiKeyName] = apiKeyValue; break;
      case 'basic': if (basicUsername) h['Authorization'] = 'Basic ' + btoa(basicUsername + ':' + basicPassword); break;
    }
    return Object.keys(h).length > 0 ? h : undefined;
  };

  const buildUrl = () => {
    let finalUrl = apiUrl;
    const enabled = [...queryParams.filter((p) => p.enabled && p.key)];
    if (authType === 'api_key' && apiKeyLocation === 'query' && apiKeyName && apiKeyValue) {
      enabled.push({ key: apiKeyName, value: apiKeyValue });
    }
    if (enabled.length > 0) {
      const sep = finalUrl.includes('?') ? '&' : '?';
      finalUrl += sep + enabled.map((p) => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value)).join('&');
    }
    return finalUrl;
  };

  const buildTestDef = () => {
    if (testType === 'ui') {
      return { name: testName || 'Untitled UI Test', type: 'ui', config: { url, headless: true, steps: steps.map((s) => { const step = { action: s.action }; if (s.selector) step.selector = s.selector; if (s.value) step.value = s.value; return step; }) } };
    }
    let parsedBody;
    if (apiBody.trim()) { try { parsedBody = JSON.parse(apiBody); } catch { throw new Error('Invalid JSON body'); } }
    return {
      name: testName || 'Untitled API Test', type: 'api',
      config: { method: apiMethod, url: buildUrl(), headers: buildHeaders(), body: parsedBody, timeout: 10000,
        assertions: assertions.map((a) => ({ target: a.target, operator: a.operator, expected: a.target === 'status' || a.target === 'response_time' ? Number(a.expected) : a.operator === 'exists' ? true : a.expected, ...(a.path ? { path: a.path } : {}) })) },
    };
  };

  const handleRun = async () => {
    setError(''); setResult(null); setRunning(true);
    try { const res = await api.request('POST', '/execute-test', { test: buildTestDef() }); setResult(res); }
    catch (err) { setError(err.message || 'Failed'); }
    finally { setRunning(false); }
  };

  const loadExample = (type) => {
    if (type === 'ui') {
      setTestType('ui'); setTestName('Example.com Title Check'); setUrl('https://example.com');
      setSteps([{ action: 'navigate', selector: '', value: 'https://example.com' }, { action: 'assert_title', selector: '', value: 'Example Domain' }, { action: 'assert_visible', selector: 'h1', value: '' }, { action: 'screenshot', selector: '', value: '' }]);
    } else {
      setTestType('api'); setTestName('JSONPlaceholder - Get User'); setApiMethod('GET'); setApiUrl('https://jsonplaceholder.typicode.com/users/1');
      setApiBody(''); setAuthType('none'); setHeaders([]); setQueryParams([]);
      setAssertions([{ target: 'status', operator: 'equals', expected: '200', path: '' }, { target: 'body', operator: 'equals', expected: 'Leanne Graham', path: 'name' }, { target: 'response_time', operator: 'less_than', expected: '5000', path: '' }]);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div><h1 className="text-2xl font-semibold">Run Test</h1><p className="text-gray-500 text-sm mt-1">Define and execute a test in real time</p></div>
        <div className="flex gap-2">
          <button onClick={() => loadExample('ui')} className="btn-ghost text-xs">UI Example</button>
          <button onClick={() => loadExample('api')} className="btn-ghost text-xs">API Example</button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6">{error}<button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button></div>}

      {/* Test Builder */}
      <div className="space-y-4 mb-6">
        <div className="card p-5">
          <div className="flex gap-3 mb-4">
            <button onClick={() => setTestType('ui')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${testType === 'ui' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Monitor size={16} /> UI Test</button>
            <button onClick={() => setTestType('api')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${testType === 'api' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}><Globe size={16} /> API Test</button>
          </div>
          <input value={testName} onChange={(e) => setTestName(e.target.value)} className="input" placeholder="Test name" />
        </div>

        {testType === 'ui' && (
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Target URL</h3>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="input mb-4" placeholder="https://example.com" />
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm">Steps</h3><button onClick={addStep} className="btn-ghost text-xs"><Plus size={14} /> Add Step</button></div>
            <div className="space-y-3">
              {steps.map((step, i) => {
                const def = UI_ACTIONS.find((a) => a.value === step.action);
                return (
                  <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-lg p-3">
                    <span className="text-xs text-gray-400 font-mono mt-2 w-6">{i + 1}.</span>
                    <div className="flex-1 space-y-2">
                      <select value={step.action} onChange={(e) => updateStep(i, 'action', e.target.value)} className="input py-1.5 text-sm">{UI_ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
                      {def?.needsSelector && <input value={step.selector} onChange={(e) => updateStep(i, 'selector', e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="CSS selector" />}
                      {def?.needsValue && <input value={step.value} onChange={(e) => updateStep(i, 'value', e.target.value)} className="input py-1.5 text-sm" placeholder={step.action === 'wait' ? 'Milliseconds' : 'Value'} />}
                    </div>
                    <button onClick={() => removeStep(i)} className="p-1.5 text-gray-300 hover:text-red-500 mt-1"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {testType === 'api' && (
          <>
            <div className="card p-5">
              <div className="flex gap-2 mb-3">
                <select value={apiMethod} onChange={(e) => setApiMethod(e.target.value)} className="input py-1.5 text-sm w-32">{API_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
                <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="input py-1.5 text-sm flex-1" placeholder="https://api.example.com/endpoint" />
              </div>
              <div className="flex gap-1 border-b border-gray-200 mb-4">
                {['params', 'auth', 'headers', 'body'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-xs font-medium capitalize border-b-2 -mb-px ${activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{tab}</button>
                ))}
              </div>

              {activeTab === 'params' && (
                <div>
                  <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500">Query Parameters</span><button onClick={addParam} className="btn-ghost text-xs"><Plus size={12} /> Add</button></div>
                  {queryParams.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No query parameters</p> : (
                    <div className="space-y-2">{queryParams.map((p, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="checkbox" checked={p.enabled} onChange={(e) => updateParam(i, 'enabled', e.target.checked)} className="rounded border-gray-300 text-brand-600" />
                        <input value={p.key} onChange={(e) => updateParam(i, 'key', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="Key" />
                        <input value={p.value} onChange={(e) => updateParam(i, 'value', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="Value" />
                        <button onClick={() => removeParam(i)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}</div>
                  )}
                </div>
              )}

              {activeTab === 'auth' && (
                <div>
                  <select value={authType} onChange={(e) => setAuthType(e.target.value)} className="input py-1.5 text-sm w-48 mb-3">
                    <option value="none">No Auth</option><option value="bearer">Bearer Token</option><option value="api_key">API Key</option><option value="basic">Basic Auth</option>
                  </select>
                  {authType === 'bearer' && <div className="bg-gray-50 rounded-lg p-4"><label className="text-xs text-gray-500 mb-1 block">Token</label><input value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="eyJhbG..." /></div>}
                  {authType === 'api_key' && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div><label className="text-xs text-gray-500 mb-1 block">Key Name</label><input value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="X-API-Key" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Key Value</label><input value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="your-key" type="password" /></div>
                      <div className="flex gap-2"><button type="button" onClick={() => setApiKeyLocation('header')} className={`px-3 py-1.5 rounded text-xs font-medium ${apiKeyLocation === 'header' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>Header</button><button type="button" onClick={() => setApiKeyLocation('query')} className={`px-3 py-1.5 rounded text-xs font-medium ${apiKeyLocation === 'query' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>Query Param</button></div>
                    </div>
                  )}
                  {authType === 'basic' && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div><label className="text-xs text-gray-500 mb-1 block">Username</label><input value={basicUsername} onChange={(e) => setBasicUsername(e.target.value)} className="input py-1.5 text-sm" /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Password</label><input value={basicPassword} onChange={(e) => setBasicPassword(e.target.value)} className="input py-1.5 text-sm" type="password" /></div>
                    </div>
                  )}
                  {authType === 'none' && <div className="text-center py-4"><Lock size={20} className="mx-auto text-gray-200 mb-1" /><p className="text-xs text-gray-400">No auth configured</p></div>}
                </div>
              )}

              {activeTab === 'headers' && (
                <div>
                  <div className="flex items-center justify-between mb-2"><span className="text-xs text-gray-500">Custom Headers</span><button onClick={addHeader} className="btn-ghost text-xs"><Plus size={12} /> Add</button></div>
                  {headers.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No custom headers</p> : (
                    <div className="space-y-2">{headers.map((h, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="checkbox" checked={h.enabled} onChange={(e) => updateHeader(i, 'enabled', e.target.checked)} className="rounded border-gray-300 text-brand-600" />
                        <input value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="Header name" />
                        <input value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="Value" />
                        <button onClick={() => removeHeader(i)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}</div>
                  )}
                </div>
              )}

              {activeTab === 'body' && (
                ['GET', 'DELETE'].includes(apiMethod) ? <p className="text-xs text-gray-400 text-center py-6">{apiMethod} requests don't have a body</p> :
                <div><label className="text-xs text-gray-500 mb-1 block">JSON Body</label><textarea value={apiBody} onChange={(e) => setApiBody(e.target.value)} className="input font-mono text-sm resize-none" rows={6} placeholder={'{\n  "key": "value"\n}'} /></div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm">Assertions</h3><button onClick={addAssertion} className="btn-ghost text-xs"><Plus size={14} /> Add</button></div>
              <div className="space-y-3">
                {assertions.map((a, i) => (
                  <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <select value={a.target} onChange={(e) => updateAssertion(i, 'target', e.target.value)} className="input py-1.5 text-sm">{ASSERTION_TARGETS.map((t) => <option key={t}>{t}</option>)}</select>
                      <select value={a.operator} onChange={(e) => updateAssertion(i, 'operator', e.target.value)} className="input py-1.5 text-sm">{ASSERTION_OPERATORS.map((o) => <option key={o}>{o}</option>)}</select>
                      {(a.target === 'body' || a.target === 'header') && <input value={a.path} onChange={(e) => updateAssertion(i, 'path', e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="JSON path" />}
                      <input value={a.expected} onChange={(e) => updateAssertion(i, 'expected', e.target.value)} className="input py-1.5 text-sm" placeholder="Expected" />
                    </div>
                    <button onClick={() => removeAssertion(i)} className="p-1.5 text-gray-300 hover:text-red-500 mt-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <button onClick={handleRun} disabled={running || (testType === 'ui' ? !url : !apiUrl)} className="btn-primary w-full py-3 text-base">
          {running ? <><Loader2 size={20} className="animate-spin" /> Running...</> : <><Play size={20} /> Run Test</>}
        </button>
      </div>

      {/* Postman-style Response Viewer */}
      {running && (
        <div className="card p-8 text-center"><Loader2 size={32} className="mx-auto text-brand-500 animate-spin mb-3" /><p className="text-sm text-gray-500">Executing test...</p></div>
      )}

      {result && <ResponseViewer result={result} />}

      {result?.id && <Link to={'/executions/' + result.id} className="btn-secondary w-full justify-center mt-4">View Full Execution Details</Link>}
    </div>
  );
}
