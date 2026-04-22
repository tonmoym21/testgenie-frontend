import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft, Plus, Loader2, Trash2, Play, CheckCircle, XCircle, Clock, Globe,
  Monitor, ChevronDown, ChevronUp, Copy, Check, Edit2, X, Lock, Share2,
  Link2, Zap, AlertCircle,
} from 'lucide-react';

const API_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const ASSERTION_TARGETS = ['status', 'body', 'header', 'response_time'];
const ASSERTION_OPERATORS = ['equals', 'contains', 'greater_than', 'less_than', 'exists', 'matches'];

// ── Response Viewer ──────────────────────────────────────────────────────────
function ResponseViewer({ result, onClose }) {
  const [activeTab, setActiveTab] = useState('body');
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  const raw = result.rawResponse || {};
  const logs = result.logs || [];
  const assertions = result.assertionResults || [];
  const extracted = result.extractedVars || {};

  const handleCopy = (text) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tabs = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers', count: raw.headers ? Object.keys(raw.headers).length : 0 },
    { id: 'assertions', label: 'Tests', count: assertions.length },
    { id: 'chain', label: 'Chain', count: Object.keys(extracted).length },
    { id: 'logs', label: 'Logs', count: logs.filter((l) => l.level !== 'debug').length },
  ];

  return (
    <div className="mt-4 border border-surface-200 rounded-xl overflow-hidden bg-white">
      <div className={`px-4 py-3 flex items-center justify-between border-l-4 ${result.status === 'passed' ? 'border-l-green-500 bg-green-50/50' : 'border-l-red-500 bg-red-50/50'}`}>
        <div className="flex items-center gap-3">
          {result.status === 'passed' ? <CheckCircle size={18} className="text-green-500" /> : <XCircle size={18} className="text-red-500" />}
          <div>
            <span className="font-semibold text-sm">{result.status === 'passed' ? 'PASSED' : 'FAILED'}</span>
            {result.error && <p className="text-xs text-red-500 mt-0.5">{result.error}</p>}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {raw.statusCode && (
            <span className={`font-mono font-bold px-2 py-1 rounded ${raw.statusCode < 300 ? 'bg-green-100 text-green-700' : raw.statusCode < 400 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {raw.statusCode} {raw.statusText}
            </span>
          )}
          <span className="flex items-center gap-1 text-surface-500"><Clock size={12} /> {raw.responseTime || result.duration}ms</span>
          {raw.size && <span className="text-surface-500">{raw.size > 1024 ? (raw.size / 1024).toFixed(1) + ' KB' : raw.size + ' B'}</span>}
          {onClose && <button onClick={onClose} className="ml-2 p-1 hover:bg-surface-100 rounded"><X size={14} /></button>}
        </div>
      </div>
      <div className="flex border-b border-surface-200 bg-surface-50/50">
        {tabs.filter(t => t.count !== 0 || t.id === 'body' || t.id === 'assertions').map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-purple-500 text-purple-600 bg-white' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
            {tab.label}{tab.count > 0 && <span className="ml-1.5 bg-surface-200 text-surface-500 rounded-full px-1.5 text-[10px]">{tab.count}</span>}
          </button>
        ))}
      </div>
      <div className="p-4 max-h-80 overflow-auto">
        {activeTab === 'body' && (
          raw.body ? (
            <div className="relative">
              <button onClick={() => handleCopy(raw.body)} className="absolute top-2 right-2 p-1.5 bg-surface-100 hover:bg-surface-200 rounded text-surface-500 text-xs flex items-center gap-1 z-10">
                {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
              <pre className="bg-surface-50 rounded-lg p-4 text-xs font-mono overflow-auto max-h-60 text-surface-700 leading-relaxed">
                {typeof raw.body === 'object' ? JSON.stringify(raw.body, null, 2) : raw.body}
              </pre>
            </div>
          ) : <p className="text-sm text-surface-400 text-center py-8">No response body</p>
        )}
        {activeTab === 'headers' && (
          raw.headers && Object.keys(raw.headers).length > 0 ? (
            <div className="bg-surface-50 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-surface-200"><th className="text-left px-3 py-2 font-medium text-surface-400 uppercase w-1/3">Key</th><th className="text-left px-3 py-2 font-medium text-surface-400 uppercase">Value</th></tr></thead>
                <tbody>{Object.entries(raw.headers).map(([k, v]) => (<tr key={k} className="border-b border-surface-100 last:border-0 hover:bg-surface-100/50"><td className="px-3 py-2 font-mono font-medium text-surface-700">{k}</td><td className="px-3 py-2 font-mono text-surface-500 break-all">{v}</td></tr>))}</tbody>
              </table>
            </div>
          ) : <p className="text-sm text-surface-400 text-center py-8">No headers captured</p>
        )}
        {activeTab === 'assertions' && (
          assertions.length > 0 ? (
            <div className="space-y-2">
              {assertions.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${a.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                  {a.passed ? <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" /> : <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />}
                  <div className="text-xs"><span className="font-medium text-surface-700">{a.target}{a.path ? '.' + a.path : ''}</span><span className="text-surface-400 mx-1">{a.operator}</span><span className="font-mono text-surface-600">{JSON.stringify(a.expected)}</span><p className={`mt-1 ${a.passed ? 'text-green-600' : 'text-red-600'}`}>{a.message}</p></div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-surface-400 text-center py-8">No assertions defined</p>
        )}
        {activeTab === 'chain' && (
          Object.keys(extracted).length > 0 ? (
            <div>
              <p className="text-xs text-surface-500 mb-3">These values are available as <code className="bg-surface-100 px-1 rounded">{'{{response.prev.NAME}}'}</code> in the next test.</p>
              <div className="bg-surface-50 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-surface-200"><th className="text-left px-3 py-2 font-medium text-surface-400 uppercase">Name</th><th className="text-left px-3 py-2 font-medium text-surface-400 uppercase">Value</th></tr></thead>
                  <tbody>{Object.entries(extracted).map(([k, v]) => (<tr key={k} className="border-b border-surface-100 last:border-0"><td className="px-3 py-2 font-mono text-purple-700">{k}</td><td className="px-3 py-2 font-mono text-surface-600">{v}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          ) : <p className="text-sm text-surface-400 text-center py-8">No extractors defined — add extractors in the test config to chain responses</p>
        )}
        {activeTab === 'logs' && (
          logs.length > 0 ? (
            <div className="bg-surface-900 rounded-lg p-3 font-mono text-xs space-y-1 max-h-60 overflow-auto">
              {logs.map((log, i) => (<div key={i} className={`${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-surface-300'}`}><span className="text-surface-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}</div>))}
            </div>
          ) : <p className="text-sm text-surface-400 text-center py-8">No logs captured</p>
        )}
      </div>
    </div>
  );
}

// ── Run Progress Bar ─────────────────────────────────────────────────────────
function RunProgressBar({ completed, total, results }) {
  if (total === 0) return null;
  const pct = Math.round((completed / total) * 100);
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status !== 'passed').length;

  return (
    <div className="card p-4 mb-6 border-2 border-purple-200 bg-purple-50/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-purple-700">Running tests… {completed}/{total}</span>
        <div className="flex items-center gap-3 text-xs">
          {passed > 0 && <span className="text-green-600 font-medium">{passed} passed</span>}
          {failed > 0 && <span className="text-red-600 font-medium">{failed} failed</span>}
        </div>
      </div>
      <div className="w-full bg-surface-200 rounded-full h-2">
        <div className="bg-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ collectionId, onClose }) {
  const [shares, setShares] = useState([]);
  const [permission, setPermission] = useState('view');
  const [email, setEmail] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    api.request('GET', `/collections/${collectionId}/share`)
      .then((d) => setShares(d.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [collectionId]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await api.request('POST', `/collections/${collectionId}/share`, { sharedWithEmail: email || undefined, permission, isPublic });
      setShares((s) => [result, ...s]);
      setEmail('');
    } catch (err) { alert(err.message); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (shareId) => {
    await api.request('DELETE', `/collections/${collectionId}/share/${shareId}`);
    setShares((s) => s.filter((x) => x.id !== shareId));
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/shared/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-5 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Share2 size={18} className="text-purple-600" /> Share Collection</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Create share */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input flex-1 text-sm" placeholder="Email (optional, for user-specific share)" />
              <select value={permission} onChange={(e) => setPermission(e.target.value)} className="input w-28 text-sm">
                <option value="view">View</option>
                <option value="run">Run</option>
                <option value="fork">Fork</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded border-surface-300 text-brand-600" />
              <label htmlFor="isPublic" className="text-sm text-surface-600">Make link public (anyone with the link)</label>
            </div>
            <button onClick={handleCreate} disabled={creating} className="btn-primary text-sm w-full">
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Generate Share Link
            </button>
          </div>

          {/* Existing shares */}
          {loading ? <div className="text-center py-4"><Loader2 size={20} className="animate-spin mx-auto text-surface-400" /></div> : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {shares.length === 0 ? (
                <p className="text-sm text-surface-400 text-center py-4">No active share links</p>
              ) : shares.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg text-sm">
                  <div className="min-w-0 flex-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded mr-2 ${s.permission === 'fork' ? 'bg-purple-100 text-purple-700' : s.permission === 'run' ? 'bg-blue-100 text-blue-700' : 'bg-surface-200 text-surface-600'}`}>{s.permission}</span>
                    <span className="text-surface-500 text-xs truncate">{s.sharedWithEmail || (s.isPublic ? 'Public link' : 'Private link')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button onClick={() => copyLink(s.shareToken)} className="p-1.5 text-surface-400 hover:text-purple-600 rounded">
                      {copied === s.shareToken ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                    <button onClick={() => handleRevoke(s.id)} className="p-1.5 text-surface-400 hover:text-red-500 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── API Builder Modal ────────────────────────────────────────────────────────
function ApiBuilderModal({ onSave, onCancel, initialData }) {
  const def = initialData ? (typeof initialData.testDefinition === 'string' ? JSON.parse(initialData.testDefinition) : initialData.testDefinition) : null;

  const [testName, setTestName] = useState(initialData?.name || '');
  const [apiMethod, setApiMethod] = useState(def?.config?.method || 'GET');
  const [apiUrl, setApiUrl] = useState(def?.config?.url || '');
  const [apiBody, setApiBody] = useState(def?.config?.body ? JSON.stringify(def.config.body, null, 2) : '');
  const [activeTab, setActiveTab] = useState('params');
  const [saving, setSaving] = useState(false);

  const [authType, setAuthType] = useState('none');
  const [bearerToken, setBearerToken] = useState('');
  const [apiKeyName, setApiKeyName] = useState('');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyLocation, setApiKeyLocation] = useState('header');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');

  const [headers, setHeaders] = useState(def?.config?.headers ? Object.entries(def.config.headers).map(([key, value]) => ({ key, value, enabled: true })) : []);
  const [queryParams, setQueryParams] = useState([]);
  const [assertions, setAssertions] = useState(def?.config?.assertions?.map(a => ({ ...a, expected: String(a.expected), path: a.path || '' })) || [{ target: 'status', operator: 'equals', expected: '200', path: '' }]);
  const [extractors, setExtractors] = useState(def?.config?.extractors || []);

  const addHeader = () => setHeaders([...headers, { key: '', value: '', enabled: true }]);
  const removeHeader = (i) => setHeaders(headers.filter((_, idx) => idx !== i));
  const updateHeader = (i, f, v) => { const u = [...headers]; u[i] = { ...u[i], [f]: v }; setHeaders(u); };

  const addParam = () => setQueryParams([...queryParams, { key: '', value: '', enabled: true }]);
  const removeParam = (i) => setQueryParams(queryParams.filter((_, idx) => idx !== i));
  const updateParam = (i, f, v) => { const u = [...queryParams]; u[i] = { ...u[i], [f]: v }; setQueryParams(u); };

  const addAssertion = () => setAssertions([...assertions, { target: 'status', operator: 'equals', expected: '200', path: '' }]);
  const removeAssertion = (i) => { if (assertions.length > 1) setAssertions(assertions.filter((_, idx) => idx !== i)); };
  const updateAssertion = (i, f, v) => { const u = [...assertions]; u[i] = { ...u[i], [f]: v }; setAssertions(u); };

  const addExtractor = () => setExtractors([...extractors, { name: '', path: '' }]);
  const removeExtractor = (i) => setExtractors(extractors.filter((_, idx) => idx !== i));
  const updateExtractor = (i, f, v) => { const u = [...extractors]; u[i] = { ...u[i], [f]: v }; setExtractors(u); };

  const buildHeaders = () => {
    const h = {};
    headers.filter((hd) => hd.enabled && hd.key).forEach((hd) => { h[hd.key] = hd.value; });
    if (authType === 'bearer' && bearerToken) h['Authorization'] = 'Bearer ' + bearerToken;
    if (authType === 'api_key' && apiKeyLocation === 'header' && apiKeyName && apiKeyValue) h[apiKeyName] = apiKeyValue;
    if (authType === 'basic' && basicUsername) h['Authorization'] = 'Basic ' + btoa(basicUsername + ':' + basicPassword);
    return Object.keys(h).length > 0 ? h : undefined;
  };

  const buildUrl = () => {
    let finalUrl = apiUrl;
    const enabled = [...queryParams.filter((p) => p.enabled && p.key)];
    if (authType === 'api_key' && apiKeyLocation === 'query' && apiKeyName && apiKeyValue) enabled.push({ key: apiKeyName, value: apiKeyValue });
    if (enabled.length > 0) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + enabled.map((p) => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value)).join('&');
    }
    return finalUrl;
  };

  const handleSave = async () => {
    if (!testName.trim() || !apiUrl.trim()) { alert('Name and URL are required'); return; }
    setSaving(true);
    try {
      let parsedBody;
      if (apiBody.trim()) {
        try { parsedBody = JSON.parse(apiBody); } catch { throw new Error('Invalid JSON body'); }
      }
      const validExtractors = extractors.filter((e) => e.name && e.path);
      const testDef = {
        name: testName,
        type: 'api',
        config: {
          method: apiMethod,
          url: buildUrl(),
          headers: buildHeaders(),
          body: parsedBody,
          timeout: 10000,
          assertions: assertions.map((a) => ({
            target: a.target,
            operator: a.operator,
            expected: a.target === 'status' || a.target === 'response_time' ? Number(a.expected) : a.operator === 'exists' ? true : a.expected,
            ...(a.path ? { path: a.path } : {}),
          })),
          ...(validExtractors.length > 0 ? { extractors: validExtractors } : {}),
        },
      };
      await onSave(testName, testDef);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const tabs = ['params', 'auth', 'headers', 'body', 'chain'];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initialData ? 'Edit API Test' : 'Add API Test'}</h2>
          <button onClick={onCancel} className="p-1.5 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white w-fit mb-3"><Globe size={16} /> API Test (JSON only)</div>
            <input value={testName} onChange={(e) => setTestName(e.target.value)} className="input" placeholder="Test name" autoFocus />
          </div>

          <div className="card p-4">
            <div className="flex gap-2 mb-3">
              <select value={apiMethod} onChange={(e) => setApiMethod(e.target.value)} className="input py-1.5 text-sm w-32">{API_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="input py-1.5 text-sm flex-1" placeholder="https://api.example.com/endpoint — supports {{env:BASE_URL}}" />
            </div>

            <div className="flex gap-1 border-b border-surface-200 mb-4">
              {tabs.map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-2 text-xs font-medium capitalize border-b-2 -mb-px ${activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-surface-400 hover:text-surface-600'}`}>
                  {tab === 'chain' ? <span className="flex items-center gap-1"><Link2 size={11} /> Chain</span> : tab}
                </button>
              ))}
            </div>

            {activeTab === 'params' && (
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-xs text-surface-500">Query Parameters</span><button onClick={addParam} className="btn-ghost text-xs"><Plus size={12} /> Add</button></div>
                {queryParams.length === 0 ? <p className="text-xs text-surface-400 text-center py-4">No query parameters</p> : (
                  <div className="space-y-2">{queryParams.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="checkbox" checked={p.enabled} onChange={(e) => updateParam(i, 'enabled', e.target.checked)} className="rounded border-surface-300 text-brand-600" />
                      <input value={p.key} onChange={(e) => updateParam(i, 'key', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="Key" />
                      <input value={p.value} onChange={(e) => updateParam(i, 'value', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="Value" />
                      <button onClick={() => removeParam(i)} className="p-1 text-surface-300 hover:text-red-500"><Trash2 size={14} /></button>
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
                {authType === 'bearer' && <div className="bg-surface-50 rounded-lg p-4"><label className="text-xs text-surface-500 mb-1 block">Token</label><input value={bearerToken} onChange={(e) => setBearerToken(e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="eyJhbG… or {{env:API_TOKEN}}" /></div>}
                {authType === 'api_key' && (
                  <div className="bg-surface-50 rounded-lg p-4 space-y-3">
                    <div><label className="text-xs text-surface-500 mb-1 block">Key Name</label><input value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="X-API-Key" /></div>
                    <div><label className="text-xs text-surface-500 mb-1 block">Key Value</label><input value={apiKeyValue} onChange={(e) => setApiKeyValue(e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="{{env:API_KEY}}" type="password" /></div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setApiKeyLocation('header')} className={`px-3 py-1.5 rounded text-xs font-medium ${apiKeyLocation === 'header' ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-500'}`}>Header</button>
                      <button type="button" onClick={() => setApiKeyLocation('query')} className={`px-3 py-1.5 rounded text-xs font-medium ${apiKeyLocation === 'query' ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-500'}`}>Query Param</button>
                    </div>
                  </div>
                )}
                {authType === 'basic' && (
                  <div className="bg-surface-50 rounded-lg p-4 space-y-3">
                    <div><label className="text-xs text-surface-500 mb-1 block">Username</label><input value={basicUsername} onChange={(e) => setBasicUsername(e.target.value)} className="input py-1.5 text-sm" /></div>
                    <div><label className="text-xs text-surface-500 mb-1 block">Password</label><input value={basicPassword} onChange={(e) => setBasicPassword(e.target.value)} className="input py-1.5 text-sm" type="password" /></div>
                  </div>
                )}
                {authType === 'none' && <div className="text-center py-4"><Lock size={20} className="mx-auto text-surface-200 mb-1" /><p className="text-xs text-surface-400">No auth configured</p></div>}
              </div>
            )}

            {activeTab === 'headers' && (
              <div>
                <div className="flex items-center justify-between mb-2"><span className="text-xs text-surface-500">Custom Headers</span><button onClick={addHeader} className="btn-ghost text-xs"><Plus size={12} /> Add</button></div>
                {headers.length === 0 ? <p className="text-xs text-surface-400 text-center py-4">No custom headers</p> : (
                  <div className="space-y-2">{headers.map((h, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="checkbox" checked={h.enabled} onChange={(e) => updateHeader(i, 'enabled', e.target.checked)} className="rounded border-surface-300 text-brand-600" />
                      <input value={h.key} onChange={(e) => updateHeader(i, 'key', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="Header name" />
                      <input value={h.value} onChange={(e) => updateHeader(i, 'value', e.target.value)} className="input py-1.5 text-sm flex-1 font-mono" placeholder="Value or {{env:KEY}}" />
                      <button onClick={() => removeHeader(i)} className="p-1 text-surface-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}</div>
                )}
              </div>
            )}

            {activeTab === 'body' && (
              ['GET', 'DELETE'].includes(apiMethod)
                ? <p className="text-xs text-surface-400 text-center py-6">{apiMethod} requests don&apos;t have a body</p>
                : <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-surface-500">JSON Body</label>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">JSON only</span>
                    </div>
                    <textarea value={apiBody} onChange={(e) => setApiBody(e.target.value)} className="input font-mono text-sm resize-none" rows={6} placeholder={'{\n  "key": "{{env:SOME_VAR}}",\n  "id": "{{response.prev.id}}"\n}'} />
                  </div>
            )}

            {activeTab === 'chain' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-medium text-surface-700">Response Extractors</span>
                    <p className="text-xs text-surface-400 mt-0.5">Extract values from this response for use as <code className="bg-surface-100 px-1 rounded">{'{{response.prev.NAME}}'}</code> in the next test</p>
                  </div>
                  <button onClick={addExtractor} className="btn-ghost text-xs"><Plus size={12} /> Add</button>
                </div>
                {extractors.length === 0 ? (
                  <div className="text-center py-6 bg-surface-50 rounded-lg">
                    <Link2 size={20} className="mx-auto text-surface-300 mb-2" />
                    <p className="text-xs text-surface-400">No extractors — add one to chain this response into the next test</p>
                    <p className="text-xs text-surface-300 mt-1">Example: name=<code>userId</code>, path=<code>data.id</code> → use as <code>{'{{response.prev.userId}}'}</code></p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {extractors.map((e, i) => (
                      <div key={i} className="flex gap-2 items-center bg-purple-50/50 rounded-lg p-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input value={e.name} onChange={(ev) => updateExtractor(i, 'name', ev.target.value)} className="input py-1.5 text-sm font-mono" placeholder="Variable name (e.g. userId)" />
                          <input value={e.path} onChange={(ev) => updateExtractor(i, 'path', ev.target.value)} className="input py-1.5 text-sm font-mono" placeholder="JSON path (e.g. data.id)" />
                        </div>
                        <button onClick={() => removeExtractor(i)} className="p-1.5 text-surface-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assertions */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm">Assertions</h3><button onClick={addAssertion} className="btn-ghost text-xs"><Plus size={14} /> Add</button></div>
            <div className="space-y-3">
              {assertions.map((a, i) => (
                <div key={i} className="flex gap-2 items-start bg-surface-50 rounded-lg p-3">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <select value={a.target} onChange={(e) => updateAssertion(i, 'target', e.target.value)} className="input py-1.5 text-sm">{ASSERTION_TARGETS.map((t) => <option key={t}>{t}</option>)}</select>
                    <select value={a.operator} onChange={(e) => updateAssertion(i, 'operator', e.target.value)} className="input py-1.5 text-sm">{ASSERTION_OPERATORS.map((o) => <option key={o}>{o}</option>)}</select>
                    {(a.target === 'body' || a.target === 'header') && <input value={a.path} onChange={(e) => updateAssertion(i, 'path', e.target.value)} className="input py-1.5 text-sm font-mono" placeholder="JSON path" />}
                    <input value={a.expected} onChange={(e) => updateAssertion(i, 'expected', e.target.value)} className="input py-1.5 text-sm" placeholder="Expected" />
                  </div>
                  <button onClick={() => removeAssertion(i)} className="p-1.5 text-surface-300 hover:text-red-500 mt-1"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-surface-200 flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <Loader2 size={16} className="animate-spin" />} {initialData ? 'Save Changes' : 'Add Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CollectionDetailPage() {
  const { collectionId } = useParams();
  const [collection, setCollection] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [showShare, setShowShare] = useState(false);

  // Run state
  const [running, setRunning] = useState(false);
  const [runProgress, setRunProgress] = useState({ completed: 0, total: 0 });
  const [progressResults, setProgressResults] = useState([]);
  const [runResults, setRunResults] = useState({});
  const [expandedTests, setExpandedTests] = useState({});
  const [runDone, setRunDone] = useState(false);
  const [runReportId, setRunReportId] = useState(null);
  const [runningOne, setRunningOne] = useState(null); // testId being run individually
  const eventSourceRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api.request('GET', '/collections/' + collectionId);
      setCollection(data);
      setTests(data.tests || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [collectionId]);

  useEffect(() => { load(); }, [load]);

  const handleAddTest = async (name, testDef) => {
    await api.request('POST', '/collections/' + collectionId + '/tests', { name, testType: 'api', testDefinition: testDef });
    setShowAdd(false);
    load();
  };

  const handleUpdateTest = async (testId, name, testDef) => {
    await api.request('PATCH', '/collections/' + collectionId + '/tests/' + testId, { name, testDefinition: testDef });
    setEditingTest(null);
    load();
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Remove this test from collection?')) return;
    await api.request('DELETE', '/collections/' + collectionId + '/tests/' + testId);
    setTests((prev) => prev.filter((t) => t.id !== testId));
  };

  // Run a single test in the collection
  const handleRunOne = async (testId) => {
    if (runningOne || running) return;
    setRunningOne(testId);
    setExpandedTests((prev) => ({ ...prev, [testId]: true }));
    try {
      const r = await api.request('POST', `/collections/${collectionId}/tests/${testId}/run`, {});
      setRunResults((prev) => ({ ...prev, [testId]: r }));
    } catch (err) {
      setRunResults((prev) => ({
        ...prev,
        [testId]: { testId, status: 'error', error: err.message, duration: 0 },
      }));
    } finally {
      setRunningOne(null);
    }
  };

  // SSE-based parallel run with live progress
  const handleRunAll = () => {
    if (running || tests.length === 0) return;

    setRunning(true);
    setRunDone(false);
    setRunResults({});
    setProgressResults([]);
    setRunProgress({ completed: 0, total: tests.length });
    setExpandedTests({});

    const token = localStorage.getItem('accessToken');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const url = `${base}/api/collections/${collectionId}/run-stream?token=${token}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('start', (e) => {
      const d = JSON.parse(e.data);
      setRunProgress({ completed: 0, total: d.total });
      if (d.reportId) setRunReportId(d.reportId);
    });

    es.addEventListener('progress', (e) => {
      const d = JSON.parse(e.data);
      setRunProgress({ completed: d.completed, total: d.total });
      setProgressResults((prev) => [...prev, d.result]);
      if (d.result.status !== 'passed') {
        setExpandedTests((prev) => ({ ...prev, [d.result.testId]: true }));
      }
    });

    es.addEventListener('done', (e) => {
      const d = JSON.parse(e.data);
      setRunDone(true);
      setRunning(false);
      if (d.reportId) setRunReportId(d.reportId);
      es.close();
      // Hydrate detailed rawResponse/logs from the saved run report
      if (d.reportId) {
        api.request('GET', `/run-reports/${d.reportId}`).then((report) => {
          const results = report.testResults || report.results || [];
          const map = {};
          results.forEach((r) => { map[r.testId] = r; });
          setRunResults(map);
        }).catch(() => {});
      }
    });

    es.addEventListener('error', () => {
      setRunning(false);
      es.close();
    });

    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  };

  const toggleExpand = (testId) => setExpandedTests((prev) => ({ ...prev, [testId]: !prev[testId] }));

  const liveResultMap = Object.fromEntries(progressResults.map((r) => [r.testId, r]));
  const mergedResults = { ...liveResultMap, ...runResults };

  const passedCount = progressResults.filter((r) => r.status === 'passed').length;
  const failedCount = progressResults.filter((r) => r.status !== 'passed').length;

  if (loading) return <div className="flex justify-center py-32"><Loader2 size={24} className="animate-spin text-brand-600" /></div>;
  if (!collection) return <div className="p-8 text-center"><p className="text-surface-500">Collection not found</p></div>;

  return (
    <div className="page">
      <Link to="/collections" className="text-sm text-surface-400 hover:text-surface-600 flex items-center gap-1 mb-3"><ArrowLeft size={14} /> Back to Collections</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          {collection.description && <p className="text-surface-500 text-sm mt-1">{collection.description}</p>}
          <p className="text-xs text-surface-400 mt-1">{tests.length} test{tests.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowShare(true)} className="btn-secondary"><Share2 size={16} /> Share</button>
          <button onClick={handleRunAll} disabled={running || tests.length === 0} className="btn-secondary">
            {running ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {running ? 'Running…' : 'Run All'}
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add Test</button>
        </div>
      </div>

      {/* Live progress bar */}
      {running && (
        <RunProgressBar completed={runProgress.completed} total={runProgress.total} results={progressResults} />
      )}

      {/* Completed summary */}
      {runDone && !running && progressResults.length > 0 && (
        <div className="card p-4 mb-6 border-2 border-purple-200 bg-purple-50/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-purple-700">Run Complete</span>
            <span className="text-green-600 font-medium">{passedCount} passed</span>
            <span className="text-red-600 font-medium">{failedCount} failed</span>
            <span className="text-sm text-surface-500">{tests.length > 0 ? Math.round((passedCount / tests.length) * 100) : 0}% pass rate</span>
          </div>
          {runReportId && (
            <Link to={`/reports/${runReportId}`} className="text-sm font-medium text-purple-700 hover:text-purple-900 inline-flex items-center gap-1">
              View full report <ArrowLeft size={14} className="rotate-180" />
            </Link>
          )}
        </div>
      )}

      {showAdd && <ApiBuilderModal onSave={handleAddTest} onCancel={() => setShowAdd(false)} />}
      {editingTest && <ApiBuilderModal initialData={tests.find((t) => t.id === editingTest)} onSave={(name, def) => handleUpdateTest(editingTest, name, def)} onCancel={() => setEditingTest(null)} />}
      {showShare && <ShareModal collectionId={collectionId} onClose={() => setShowShare(false)} />}

      {tests.length === 0 ? (
        <div className="text-center py-20">
          <Globe size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-medium text-surface-600 mb-1">No tests in this collection</h3>
          <p className="text-surface-400 text-sm mb-6">Add API tests to build your collection</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add Test</button>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test, i) => {
            const def = typeof test.testDefinition === 'string' ? JSON.parse(test.testDefinition) : test.testDefinition;
            const result = mergedResults[test.id];
            const isExpanded = expandedTests[test.id];
            const hasExtractors = (def?.config?.extractors || []).length > 0;

            return (
              <div key={test.id} className="card overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs text-surface-400 font-mono w-6 shrink-0">{i + 1}.</span>
                    {result ? (result.status === 'passed' ? <CheckCircle size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-red-500 shrink-0" />) : (running ? <Loader2 size={16} className="animate-spin text-purple-400 shrink-0" /> : <Globe size={16} className="text-purple-400 shrink-0" />)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{test.name}</span>
                        {hasExtractors && <span className="shrink-0 text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-1"><Link2 size={9} /> chains</span>}
                      </div>
                      <div className="text-xs text-surface-400 font-mono truncate">
                        <span className={`mr-2 font-bold ${def?.config?.method === 'GET' ? 'text-green-600' : def?.config?.method === 'POST' ? 'text-yellow-600' : def?.config?.method === 'DELETE' ? 'text-red-600' : 'text-blue-600'}`}>{def?.config?.method}</span>
                        {def?.config?.url}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result && <span className="text-xs text-surface-400">{result.duration}ms</span>}
                    <button
                      onClick={() => handleRunOne(test.id)}
                      disabled={running || runningOne === test.id}
                      title="Run this test"
                      className="p-1.5 text-surface-300 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {runningOne === test.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    </button>
                    <button onClick={() => setEditingTest(test.id)} className="p-1.5 text-surface-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteTest(test.id)} className="p-1.5 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    {result && (
                      <button onClick={() => toggleExpand(test.id)} className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && result && result.rawResponse && (
                  <div className="border-t border-surface-100 px-4 pb-4">
                    <ResponseViewer result={result} onClose={() => toggleExpand(test.id)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
