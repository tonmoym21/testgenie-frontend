import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Plus, Loader2, Trash2, Play, CheckCircle, XCircle, Clock, Globe, Monitor } from 'lucide-react';

export default function CollectionDetailPage() {
  const { collectionId } = useParams();
  const [collection, setCollection] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);

  // Add test form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('api');
  const [newMethod, setNewMethod] = useState('GET');
  const [newUrl, setNewUrl] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newAssertStatus, setNewAssertStatus] = useState('200');

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
        let parsedBody = undefined;
        if (newBody.trim()) { try { parsedBody = JSON.parse(newBody); } catch { throw new Error('Invalid JSON body'); } }
        testDef = {
          name: newName,
          type: 'api',
          config: {
            method: newMethod,
            url: newUrl,
            body: parsedBody,
            timeout: 10000,
            assertions: [{ target: 'status', operator: 'equals', expected: Number(newAssertStatus) }],
          },
        };
      } else {
        testDef = {
          name: newName,
          type: 'ui',
          config: {
            url: newUrl,
            headless: true,
            steps: [
              { action: 'navigate', value: newUrl },
              { action: 'assert_title', value: newName },
              { action: 'screenshot' },
            ],
          },
        };
      }

      await api.request('POST', '/collections/' + collectionId + '/tests', {
        name: newName,
        testType: newType,
        testDefinition: testDef,
      });
      setShowAdd(false);
      setNewName('');
      setNewUrl('');
      setNewBody('');
      setNewAssertStatus('200');
      load();
    } catch (err) { alert(err.message); }
    finally { setAdding(false); }
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
    setRunResult(null);
    try {
      const result = await api.request('POST', '/collections/' + collectionId + '/run');
      setRunResult(result);
    } catch (err) { console.error(err); }
    finally { setRunning(false); }
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 size={24} className="animate-spin text-brand-600" /></div>;
  if (!collection) return <div className="p-8 text-center"><p className="text-gray-500">Collection not found</p></div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/collections" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3"><ArrowLeft size={14} /> Back to Collections</Link>

      <div className="flex items-center justify-between mb-8">
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

      {/* Run Results */}
      {runResult && (
        <div className="card p-5 mb-6 border-2 border-brand-200 bg-brand-50/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Collection Run Results</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 font-medium">{runResult.passed} passed</span>
              <span className="text-red-600 font-medium">{runResult.failed} failed</span>
              <span className="text-gray-500">{runResult.passRate}% pass rate</span>
            </div>
          </div>
          <div className="space-y-2">
            {runResult.results.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-3">
                  {r.status === 'passed' ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                  <span className="text-sm font-medium">{r.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock size={12} /> {r.duration}ms</span>
                  <span className={`badge ${r.status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Test Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add Test to Collection</h2>
            <form onSubmit={handleAddTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Test Name</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="E.g. Get Users" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewType('api')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${newType === 'api' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}><Globe size={14} /> API</button>
                  <button type="button" onClick={() => setNewType('ui')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${newType === 'ui' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'}`}><Monitor size={14} /> UI</button>
                </div>
              </div>
              {newType === 'api' && (
                <>
                  <div className="flex gap-2">
                    <select value={newMethod} onChange={(e) => setNewMethod(e.target.value)} className="input py-1.5 text-sm w-28">
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                    </select>
                    <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="input py-1.5 text-sm flex-1" placeholder="https://api.example.com/endpoint" required />
                  </div>
                  {!['GET', 'DELETE'].includes(newMethod) && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Body (JSON)</label>
                      <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} className="input font-mono text-sm resize-none" rows={3} placeholder='{"key": "value"}' />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Expected Status Code</label>
                    <input value={newAssertStatus} onChange={(e) => setNewAssertStatus(e.target.value)} className="input py-1.5 text-sm w-24" />
                  </div>
                </>
              )}
              {newType === 'ui' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">URL</label>
                  <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="input" placeholder="https://example.com" required />
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={adding} className="btn-primary">
                  {adding && <Loader2 size={16} className="animate-spin" />} Add Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tests List */}
      {tests.length === 0 ? (
        <div className="text-center py-20">
          <Play size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No tests in this collection</h3>
          <p className="text-gray-400 text-sm mb-6">Add tests to build your collection</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Add Test</button>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((test, i) => {
            const def = typeof test.testDefinition === 'string' ? JSON.parse(test.testDefinition) : test.testDefinition;
            return (
              <div key={test.id} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono w-6">{i + 1}.</span>
                  {test.testType === 'api' ? <Globe size={16} className="text-purple-500" /> : <Monitor size={16} className="text-brand-500" />}
                  <div>
                    <span className="text-sm font-medium">{test.name}</span>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">
                      {test.testType === 'api' ? (def?.config?.method + ' ' + def?.config?.url) : def?.config?.url}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-gray-100 text-gray-500 text-[10px]">{test.testType.toUpperCase()}</span>
                  <button onClick={() => handleDeleteTest(test.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
