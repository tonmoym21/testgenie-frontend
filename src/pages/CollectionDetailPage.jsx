import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Plus, Loader2, Trash2, Play, CheckCircle, XCircle, Clock, Globe, Monitor, ChevronDown, ChevronUp, Copy, Check, Edit2, Save, X } from 'lucide-react';

// Postman-style Response Viewer Component
function ResponseViewer({ result, onClose }) {
  const [activeTab, setActiveTab] = useState('body');
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const raw = result.rawResponse || {};
  const logs = result.logs || [];
  const assertions = result.assertionResults || [];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tabs = [
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers', count: raw.headers ? Object.keys(raw.headers).length : 0 },
    { id: 'assertions', label: 'Tests', count: assertions.length },
    { id: 'logs', label: 'Logs', count: logs.filter((l) => l.level !== 'debug').length },
  ];

  return (
    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Status Bar */}
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
          <span className="flex items-center gap-1 text-gray-500"><Clock size={12} /> {raw.responseTime || result.duration}ms</span>
          {raw.size && <span className="text-gray-500">{raw.size > 1024 ? (raw.size / 1024).toFixed(1) + ' KB' : raw.size + ' B'}</span>}
          {onClose && <button onClick={onClose} className="ml-2 p-1 hover:bg-gray-100 rounded"><X size={14} /></button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-purple-500 text-purple-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            {tab.label}
            {tab.count > 0 && <span className="ml-1.5 bg-gray-200 text-gray-500 rounded-full px-1.5 text-[10px]">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 max-h-80 overflow-auto">
        {/* Body Tab */}
        {activeTab === 'body' && (
          <div>
            {raw.body ? (
              <div className="relative">
                <button onClick={() => handleCopy(raw.body)} className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-500 text-xs flex items-center gap-1 z-10">
                  {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
                <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono overflow-auto max-h-60 text-gray-700 leading-relaxed">
                  {typeof raw.body === 'object' ? JSON.stringify(raw.body, null, 2) : raw.body}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No response body</p>
            )}
          </div>
        )}

        {/* Headers Tab */}
        {activeTab === 'headers' && (
          <div>
            {raw.headers && Object.keys(raw.headers).length > 0 ? (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-medium text-gray-400 uppercase w-1/3">Key</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-400 uppercase">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(raw.headers).map(([key, value]) => (
                      <tr key={key} className="border-b border-gray-100 last:border-0 hover:bg-gray-100/50">
                        <td className="px-3 py-2 font-mono font-medium text-gray-700">{key}</td>
                        <td className="px-3 py-2 font-mono text-gray-500 break-all">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No headers captured</p>
            )}
          </div>
        )}

        {/* Assertions Tab */}
        {activeTab === 'assertions' && (
          <div>
            {assertions.length > 0 ? (
              <div className="space-y-2">
                {assertions.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${a.passed ? 'bg-green-50' : 'bg-red-50'}`}>
                    {a.passed ? <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" /> : <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />}
                    <div className="text-xs">
                      <span className="font-medium text-gray-700">{a.target}{a.path ? '.' + a.path : ''}</span>
                      <span className="text-gray-400 mx-1">{a.operator}</span>
                      <span className="font-mono text-gray-600">{JSON.stringify(a.expected)}</span>
                      <p className={`mt-1 ${a.passed ? 'text-green-600' : 'text-red-600'}`}>{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No assertions defined</p>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            {logs.length > 0 ? (
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs space-y-1 max-h-60 overflow-auto">
                {logs.map((log, i) => (
                  <div key={i} className={`${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No logs captured</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Test Editor Component
function TestEditor({ test, onSave, onCancel }) {
  const def = typeof test.testDefinition === 'string' ? JSON.parse(test.testDefinition) : test.testDefinition;
  const [name, setName] = useState(test.name);
  const [method, setMethod] = useState(def?.config?.method || 'GET');
  const [url, setUrl] = useState(def?.config?.url || '');
  const [body, setBody] = useState(def?.config?.body ? JSON.stringify(def.config.body, null, 2) : '');
  const [headers, setHeaders] = useState(def?.config?.headers ? JSON.stringify(def.config.headers, null, 2) : '{}');
  const [assertions, setAssertions] = useState(def?.config?.assertions || [{ target: 'status', operator: 'equals', expected: 200 }]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      let parsedBody, parsedHeaders;
      if (body.trim()) { try { parsedBody = JSON.parse(body); } catch { throw new Error('Invalid JSON body'); } }
      try { parsedHeaders = JSON.parse(headers); } catch { parsedHeaders = {}; }

      const newDef = {
        name,
        type: 'api',
        config: { method, url, body: parsedBody, headers: parsedHeaders, timeout: 10000, assertions },
      };
      await onSave(name, newDef);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const updateAssertion = (idx, field, value) => {
    setAssertions((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const addAssertion = () => {
    setAssertions((prev) => [...prev, { target: 'status', operator: 'equals', expected: 200 }]);
  };

  const removeAssertion = (idx) => {
    setAssertions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Test Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input py-1.5 text-sm" />
      </div>
      <div className="flex gap-2">
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="input py-1.5 text-sm w-28">
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="input py-1.5 text-sm flex-1" placeholder="https://api.example.com/endpoint" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Headers (JSON)</label>
        <textarea value={headers} onChange={(e) => setHeaders(e.target.value)} className="input font-mono text-xs resize-none" rows={2} placeholder='{"Authorization": "Bearer token"}' />
      </div>
      {!['GET', 'DELETE'].includes(method) && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Body (JSON)</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="input font-mono text-xs resize-none" rows={3} placeholder='{"key": "value"}' />
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-500">Assertions</label>
          <button onClick={addAssertion} className="text-xs text-purple-600 hover:underline">+ Add Assertion</button>
        </div>
        <div className="space-y-2">
          {assertions.map((a, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={a.target} onChange={(e) => updateAssertion(i, 'target', e.target.value)} className="input py-1 text-xs w-24">
                <option value="status">Status</option>
                <option value="body">Body</option>
                <option value="header">Header</option>
                <option value="response_time">Time</option>
              </select>
              {(a.target === 'body' || a.target === 'header') && (
                <input value={a.path || ''} onChange={(e) => updateAssertion(i, 'path', e.target.value)} className="input py-1 text-xs w-24" placeholder="path" />
              )}
              <select value={a.operator} onChange={(e) => updateAssertion(i, 'operator', e.target.value)} className="input py-1 text-xs w-28">
                <option value="equals">equals</option>
                <option value="contains">contains</option>
                <option value="exists">exists</option>
                <option value="greater_than">&gt;</option>
                <option value="less_than">&lt;</option>
                <option value="matches">matches</option>
              </select>
              <input value={a.expected ?? ''} onChange={(e) => updateAssertion(i, 'expected', a.target === 'status' || a.operator === 'greater_than' || a.operator === 'less_than' ? Number(e.target.value) : e.target.value)} className="input py-1 text-xs flex-1" placeholder="expected" />
              <button onClick={() => removeAssertion(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button onClick={onCancel} className="btn-secondary text-xs py-1.5">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1.5">
          {saving && <Loader2 size={12} className="animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}

export default function CollectionDetailPage() {
  const { collectionId } = useParams();
  const [collection, setCollection] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState({});
  const [expandedTests, setExpandedTests] = useState({});
  const [editingTest, setEditingTest] = useState(null);

  // Add test form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('api');
  const [newMethod, setNewMethod] = useState('GET');
  const [newUrl, setNewUrl] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newHeaders, setNewHeaders] = useState('{}');
  const [newAssertions, setNewAssertions] = useState([{ target: 'status', operator: 'equals', expected: 200 }]);

  const load = useCallback(async () => {
    try {
      const data = await api.request('GET', '/collections/' + collectionId);
      setCollection(data);
      setTests(data.tests || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [collectionId]);

  useEffect(() => { load(); }, [load]);

  const handleAddTest = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      let testDef;
      if (newType === 'api') {
        let parsedBody, parsedHeaders;
        if (newBody.trim()) { try { parsedBody = JSON.parse(newBody); } catch { throw new Error('Invalid JSON body'); } }
        try { parsedHeaders = JSON.parse(newHeaders); } catch { parsedHeaders = {}; }
        testDef = {
          name: newName,
          type: 'api',
          config: { method: newMethod, url: newUrl, body: parsedBody, headers: parsedHeaders, timeout: 10000, assertions: newAssertions },
        };
      } else {
        testDef = {
          name: newName,
          type: 'ui',
          config: { url: newUrl, headless: true, steps: [{ action: 'navigate', value: newUrl }, { action: 'assert_title', value: newName }, { action: 'screenshot' }] },
        };
      }
      await api.request('POST', '/collections/' + collectionId + '/tests', { name: newName, testType: newType, testDefinition: testDef });
      setShowAdd(false);
      setNewName(''); setNewUrl(''); setNewBody(''); setNewHeaders('{}'); setNewAssertions([{ target: 'status', operator: 'equals', expected: 200 }]);
      load();
    } catch (err) { alert(err.message); }
    finally { setAdding(false); }
  };

  const handleUpdateTest = async (testId, name, testDef) => {
    await api.request('PATCH', '/collections/' + collectionId + '/tests/' + testId, { name, testDefinition: testDef });
    setEditingTest(null);
    load();
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Remove this test from collection?')) return;
    try {
      await api.request('DELETE', '/collections/' + collectionId + '/tests/' + testId);
      setTests((prev) => prev.filter((t) => t.id !== testId));
    } catch (err) { console.error(err); }
  };

  const handleRunAll = async () => {
    setRunning(true);
    setRunResults({});
    try {
      const result = await api.request('POST', '/collections/' + collectionId + '/run');
      const resultsMap = {};
      result.results.forEach((r) => { resultsMap[r.testId] = r; });
      setRunResults(resultsMap);
      // Auto-expand all tests with results
      const expanded = {};
      result.results.forEach((r) => { expanded[r.testId] = true; });
      setExpandedTests(expanded);
    } catch (err) { console.error(err); }
    finally { setRunning(false); }
  };

  const toggleExpand = (testId) => {
    setExpandedTests((prev) => ({ ...prev, [testId]: !prev[testId] }));
  };

  const updateNewAssertion = (idx, field, value) => {
    setNewAssertions((prev) => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 size={24} className="animate-spin text-brand-600" /></div>;
  if (!collection) return <div className="p-8 text-center"><p className="text-gray-500">Collection not found</p></div>;

  const passedCount = Object.values(runResults).filter((r) => r.status === 'passed').length;
  const failedCount = Object.values(runResults).filter((r) => r.status !== 'passed').length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/collections" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3"><ArrowLeft size={14} /> Back to Collections</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          {collection.description && <p className="text-gray-500 text-sm mt-1">{collection.description}</p>}
          <p className="text-xs text-gray-400 mt-1">{tests.length} test{tests.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRunAll} disabled={running || tests.length === 0} className="btn-secondary">
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Run All
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add Test</button>
        </div>
      </div>

      {/* Run Summary Banner */}
      {Object.keys(runResults).length > 0 && (
        <div className="card p-4 mb-6 border-2 border-purple-200 bg-purple-50/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-purple-700">Run Complete</span>
            <span className="text-green-600 font-medium">{passedCount} passed</span>
            <span className="text-red-600 font-medium">{failedCount} failed</span>
          </div>
          <span className="text-sm text-gray-500">{tests.length > 0 ? Math.round((passedCount / tests.length) * 100) : 0}% pass rate</span>
        </div>
      )}

      {/* Add Test Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-4">Add API Test</h2>
            <form onSubmit={handleAddTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Test Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="E.g. Get Users" required autoFocus />
              </div>
              <div className="flex gap-2">
                <select value={newMethod} onChange={(e) => setNewMethod(e.target.value)} className="input py-2 text-sm w-28">
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                </select>
                <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="input py-2 text-sm flex-1" placeholder="https://api.example.com/endpoint" required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Headers (JSON)</label>
                <textarea value={newHeaders} onChange={(e) => setNewHeaders(e.target.value)} className="input font-mono text-sm resize-none" rows={2} placeholder='{"Authorization": "Bearer token"}' />
              </div>
              {!['GET', 'DELETE'].includes(newMethod) && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Body (JSON)</label>
                  <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} className="input font-mono text-sm resize-none" rows={3} placeholder='{"key": "value"}' />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Assertions</label>
                  <button type="button" onClick={() => setNewAssertions([...newAssertions, { target: 'status', operator: 'equals', expected: 200 }])} className="text-xs text-purple-600 hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {newAssertions.map((a, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={a.target} onChange={(e) => updateNewAssertion(i, 'target', e.target.value)} className="input py-1.5 text-sm w-24">
                        <option value="status">Status</option>
                        <option value="body">Body</option>
                        <option value="header">Header</option>
                        <option value="response_time">Time</option>
                      </select>
                      {(a.target === 'body' || a.target === 'header') && (
                        <input value={a.path || ''} onChange={(e) => updateNewAssertion(i, 'path', e.target.value)} className="input py-1.5 text-sm w-24" placeholder="path" />
                      )}
                      <select value={a.operator} onChange={(e) => updateNewAssertion(i, 'operator', e.target.value)} className="input py-1.5 text-sm w-28">
                        <option value="equals">equals</option>
                        <option value="contains">contains</option>
                        <option value="exists">exists</option>
                        <option value="greater_than">&gt;</option>
                        <option value="less_than">&lt;</option>
                        <option value="matches">matches</option>
                      </select>
                      <input value={a.expected ?? ''} onChange={(e) => updateNewAssertion(i, 'expected', a.target === 'status' || a.operator === 'greater_than' || a.operator === 'less_than' ? Number(e.target.value) : e.target.value)} className="input py-1.5 text-sm flex-1" placeholder="expected" />
                      {newAssertions.length > 1 && <button type="button" onClick={() => setNewAssertions(newAssertions.filter((_, idx) => idx !== i))} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={adding} className="btn-primary">{adding && <Loader2 size={16} className="animate-spin" />} Add Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tests List */}
      {tests.length === 0 ? (
        <div className="text-center py-20">
          <Globe size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No tests in this collection</h3>
          <p className="text-gray-400 text-sm mb-6">Add API tests to build your collection</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add Test</button>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((test, i) => {
            const def = typeof test.testDefinition === 'string' ? JSON.parse(test.testDefinition) : test.testDefinition;
            const result = runResults[test.id];
            const isExpanded = expandedTests[test.id];
            const isEditing = editingTest === test.id;

            return (
              <div key={test.id} className="card overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs text-gray-400 font-mono w-6 shrink-0">{i + 1}.</span>
                    {result && (result.status === 'passed' ? <CheckCircle size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-red-500 shrink-0" />)}
                    {!result && (test.testType === 'api' ? <Globe size={16} className="text-purple-500 shrink-0" /> : <Monitor size={16} className="text-brand-500 shrink-0" />)}
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium block truncate">{test.name}</span>
                      <div className="text-xs text-gray-400 font-mono truncate">
                        {test.testType === 'api' && <span className={`mr-2 font-bold ${def?.config?.method === 'GET' ? 'text-green-600' : def?.config?.method === 'POST' ? 'text-yellow-600' : def?.config?.method === 'DELETE' ? 'text-red-600' : 'text-blue-600'}`}>{def?.config?.method}</span>}
                        {def?.config?.url}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result && <span className="text-xs text-gray-400">{result.duration}ms</span>}
                    <button onClick={() => setEditingTest(isEditing ? null : test.id)} className="p-1.5 text-gray-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDeleteTest(test.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    {result && (
                      <button onClick={() => toggleExpand(test.id)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Editor */}
                {isEditing && (
                  <div className="border-t border-gray-100 p-4">
                    <TestEditor test={test} onSave={(name, def) => handleUpdateTest(test.id, name, def)} onCancel={() => setEditingTest(null)} />
                  </div>
                )}

                {/* Response Viewer */}
                {isExpanded && result && !isEditing && (
                  <div className="border-t border-gray-100 px-4 pb-4">
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
