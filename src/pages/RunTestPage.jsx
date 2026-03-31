import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  Play, Loader2, CheckCircle, XCircle, Monitor, Globe, Plus, Trash2,
  Clock, Image, Terminal, Info, AlertTriangle, ChevronDown
} from 'lucide-react';

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

const LOG_ICON = {
  info: <Info size={12} className="text-blue-400 mt-0.5 shrink-0" />,
  warn: <AlertTriangle size={12} className="text-yellow-500 mt-0.5 shrink-0" />,
  error: <XCircle size={12} className="text-red-500 mt-0.5 shrink-0" />,
  debug: <Terminal size={12} className="text-gray-400 mt-0.5 shrink-0" />,
};

export default function RunTestPage() {
  const [testType, setTestType] = useState('ui');
  const [testName, setTestName] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // UI test state
  const [url, setUrl] = useState('');
  const [steps, setSteps] = useState([{ action: 'navigate', selector: '', value: '' }]);

  // API test state
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiUrl, setApiUrl] = useState('');
  const [apiBody, setApiBody] = useState('');
  const [assertions, setAssertions] = useState([
    { target: 'status', operator: 'equals', expected: '200', path: '' }
  ]);

  const addStep = () => {
    setSteps([...steps, { action: 'click', selector: '', value: '' }]);
  };

  const removeStep = (i) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, idx) => idx !== i));
  };

  const updateStep = (i, field, val) => {
    const updated = [...steps];
    updated[i] = { ...updated[i], [field]: val };
    setSteps(updated);
  };

  const addAssertion = () => {
    setAssertions([...assertions, { target: 'status', operator: 'equals', expected: '', path: '' }]);
  };

  const removeAssertion = (i) => {
    if (assertions.length <= 1) return;
    setAssertions(assertions.filter((_, idx) => idx !== i));
  };

  const updateAssertion = (i, field, val) => {
    const updated = [...assertions];
    updated[i] = { ...updated[i], [field]: val };
    setAssertions(updated);
  };

  const buildTestDef = () => {
    if (testType === 'ui') {
      return {
        name: testName || 'Untitled UI Test',
        type: 'ui',
        config: {
          url: url,
          headless: true,
          steps: steps.map((s) => {
            const step = { action: s.action };
            if (s.selector) step.selector = s.selector;
            if (s.value) step.value = s.value;
            return step;
          }),
        },
      };
    } else {
      let parsedBody = undefined;
      if (apiBody.trim()) {
        try {
          parsedBody = JSON.parse(apiBody);
        } catch {
          throw new Error('Invalid JSON in request body');
        }
      }
      return {
        name: testName || 'Untitled API Test',
        type: 'api',
        config: {
          method: apiMethod,
          url: apiUrl,
          body: parsedBody,
          timeout: 10000,
          assertions: assertions.map((a) => {
            const assertion = {
              target: a.target,
              operator: a.operator,
              expected: a.target === 'status' || a.target === 'response_time'
                ? Number(a.expected)
                : a.operator === 'exists' ? true : a.expected,
            };
            if (a.path) assertion.path = a.path;
            return assertion;
          }),
        },
      };
    }
  };

  const handleRun = async () => {
    setError('');
    setResult(null);
    setRunning(true);

    try {
      const testDef = buildTestDef();
      const res = await api.request('POST', '/execute-test', { test: testDef });
      setResult(res);
    } catch (err) {
      setError(err.message || 'Test execution failed');
    } finally {
      setRunning(false);
    }
  };

  const loadExample = (type) => {
    if (type === 'ui') {
      setTestType('ui');
      setTestName('Example.com Title Check');
      setUrl('https://example.com');
      setSteps([
        { action: 'navigate', selector: '', value: 'https://example.com' },
        { action: 'assert_title', selector: '', value: 'Example Domain' },
        { action: 'assert_visible', selector: 'h1', value: '' },
        { action: 'screenshot', selector: '', value: '' },
      ]);
    } else {
      setTestType('api');
      setTestName('JSONPlaceholder - Get User');
      setApiMethod('GET');
      setApiUrl('https://jsonplaceholder.typicode.com/users/1');
      setApiBody('');
      setAssertions([
        { target: 'status', operator: 'equals', expected: '200', path: '' },
        { target: 'body', operator: 'equals', expected: 'Leanne Graham', path: 'name' },
        { target: 'response_time', operator: 'less_than', expected: '5000', path: '' },
      ]);
    }
  };

  const logs = result?.logs || [];
  const screenshots = result?.screenshots || [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Run Test</h1>
          <p className="text-gray-500 text-sm mt-1">Define and execute a test in real time</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadExample('ui')} className="btn-ghost text-xs">Load UI Example</button>
          <button onClick={() => loadExample('api')} className="btn-ghost text-xs">Load API Example</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Builder */}
        <div className="lg:col-span-2 space-y-4">
          {/* Test Type + Name */}
          <div className="card p-5">
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setTestType('ui')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  testType === 'ui' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Monitor size={16} /> UI Test
              </button>
              <button
                onClick={() => setTestType('api')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  testType === 'api' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Globe size={16} /> API Test
              </button>
            </div>
            <input
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="input"
              placeholder="Test name (e.g. Login Flow Test)"
            />
          </div>

          {/* UI Test Builder */}
          {testType === 'ui' && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-3">Target URL</h3>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input mb-4"
                placeholder="https://example.com"
              />

              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Steps</h3>
                <button onClick={addStep} className="btn-ghost text-xs">
                  <Plus size={14} /> Add Step
                </button>
              </div>

              <div className="space-y-3">
                {steps.map((step, i) => {
                  const actionDef = UI_ACTIONS.find((a) => a.value === step.action);
                  return (
                    <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-lg p-3">
                      <span className="text-xs text-gray-400 font-mono mt-2 w-6">{i + 1}.</span>
                      <div className="flex-1 space-y-2">
                        <select
                          value={step.action}
                          onChange={(e) => updateStep(i, 'action', e.target.value)}
                          className="input py-1.5 text-sm"
                        >
                          {UI_ACTIONS.map((a) => (
                            <option key={a.value} value={a.value}>{a.label}</option>
                          ))}
                        </select>
                        {actionDef?.needsSelector && (
                          <input
                            value={step.selector}
                            onChange={(e) => updateStep(i, 'selector', e.target.value)}
                            className="input py-1.5 text-sm font-mono"
                            placeholder="CSS selector (e.g. #login-btn, .input-email)"
                          />
                        )}
                        {actionDef?.needsValue && (
                          <input
                            value={step.value}
                            onChange={(e) => updateStep(i, 'value', e.target.value)}
                            className="input py-1.5 text-sm"
                            placeholder={step.action === 'wait' ? 'Milliseconds (e.g. 2000)' : 'Value'}
                          />
                        )}
                      </div>
                      <button
                        onClick={() => removeStep(i)}
                        className="p-1.5 text-gray-300 hover:text-red-500 mt-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* API Test Builder */}
          {testType === 'api' && (
            <div className="card p-5">
              <h3 className="font-semibold text-sm mb-3">Request</h3>
              <div className="flex gap-2 mb-3">
                <select
                  value={apiMethod}
                  onChange={(e) => setApiMethod(e.target.value)}
                  className="input py-1.5 text-sm w-32"
                >
                  {API_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="input py-1.5 text-sm flex-1"
                  placeholder="https://api.example.com/users"
                />
              </div>

              {!['GET', 'DELETE'].includes(apiMethod) && (
                <div className="mb-4">
                  <label className="text-xs text-gray-500 mb-1 block">Request Body (JSON)</label>
                  <textarea
                    value={apiBody}
                    onChange={(e) => setApiBody(e.target.value)}
                    className="input font-mono text-sm resize-none"
                    rows={4}
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Assertions</h3>
                <button onClick={addAssertion} className="btn-ghost text-xs">
                  <Plus size={14} /> Add Assertion
                </button>
              </div>

              <div className="space-y-3">
                {assertions.map((a, i) => (
                  <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <select
                        value={a.target}
                        onChange={(e) => updateAssertion(i, 'target', e.target.value)}
                        className="input py-1.5 text-sm"
                      >
                        {ASSERTION_TARGETS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        value={a.operator}
                        onChange={(e) => updateAssertion(i, 'operator', e.target.value)}
                        className="input py-1.5 text-sm"
                      >
                        {ASSERTION_OPERATORS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                      {(a.target === 'body' || a.target === 'header') && (
                        <input
                          value={a.path}
                          onChange={(e) => updateAssertion(i, 'path', e.target.value)}
                          className="input py-1.5 text-sm font-mono"
                          placeholder="JSON path (e.g. data.name)"
                        />
                      )}
                      <input
                        value={a.expected}
                        onChange={(e) => updateAssertion(i, 'expected', e.target.value)}
                        className="input py-1.5 text-sm"
                        placeholder="Expected value"
                      />
                    </div>
                    <button
                      onClick={() => removeAssertion(i)}
                      className="p-1.5 text-gray-300 hover:text-red-500 mt-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={running || (testType === 'ui' ? !url : !apiUrl)}
            className="btn-primary w-full py-3 text-base"
          >
            {running ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Running test...
              </>
            ) : (
              <>
                <Play size={20} />
                Run Test
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {!result && !running && (
            <div className="card p-8 text-center">
              <Play size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Define a test and click Run to see results here</p>
            </div>
          )}

          {running && (
            <div className="card p-8 text-center">
              <Loader2 size={32} className="mx-auto text-brand-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Executing test...</p>
              <p className="text-xs text-gray-400 mt-1">UI tests may take 5-15 seconds</p>
            </div>
          )}

          {result && (
            <>
              {/* Status Card */}
              <div className={`card p-5 border-2 ${result.status === 'passed' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <div className="flex items-center gap-3">
                  {result.status === 'passed' ? (
                    <CheckCircle size={28} className="text-green-500" />
                  ) : (
                    <XCircle size={28} className="text-red-500" />
                  )}
                  <div>
                    <div className="font-semibold text-lg">
                      {result.status === 'passed' ? 'TEST PASSED' : 'TEST FAILED'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1"><Clock size={12} /> {result.duration}ms</span>
                      <span>{result.type?.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
                {result.error && (
                  <div className="mt-3 bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg">
                    {result.error}
                  </div>
                )}
              </div>

              {/* Screenshots */}
              {screenshots.length > 0 && (
                <div className="card">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Image size={14} /> Screenshots ({screenshots.length})
                    </h3>
                  </div>
                  <div className="p-3 space-y-2">
                    {screenshots.map((filename, i) => (
                      <div key={i} className="border rounded-lg overflow-hidden">
                        <img
                          src={`/api/screenshots/${filename}`}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-auto"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="px-3 py-1.5 bg-gray-50 text-xs text-gray-500 truncate">{filename}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logs */}
              <div className="card">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Terminal size={14} /> Logs ({logs.length})
                  </h3>
                </div>
                <div className="p-3 max-h-80 overflow-y-auto">
                  {logs.filter((l) => l.level !== 'debug').map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs font-mono py-0.5">
                      {LOG_ICON[log.level] || LOG_ICON.info}
                      <span className={`${log.level === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* View in History */}
              {result.id && (
                <Link to={`/executions/${result.id}`} className="btn-secondary w-full justify-center">
                  View Full Details
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}