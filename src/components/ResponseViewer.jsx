import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Copy, Check } from 'lucide-react';

export default function ResponseViewer({ result }) {
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
    <div className="space-y-4">
      {/* Status Bar */}
      <div className={`card p-4 flex items-center justify-between border-l-4 ${result.status === 'passed' ? 'border-l-green-500' : 'border-l-red-500'}`}>
        <div className="flex items-center gap-3">
          {result.status === 'passed' ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
          <div>
            <span className="font-semibold">{result.status === 'passed' ? 'PASSED' : 'FAILED'}</span>
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
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {tab.label}
              {tab.count > 0 && <span className="ml-1.5 bg-gray-100 text-gray-500 rounded-full px-1.5 text-[10px]">{tab.count}</span>}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Body Tab */}
          {activeTab === 'body' && (
            <div>
              {raw.body ? (
                <div className="relative">
                  <button onClick={() => handleCopy(raw.body)} className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-500 text-xs flex items-center gap-1 z-10">
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 text-gray-700 leading-relaxed">
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

          {/* Assertions/Tests Tab */}
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
                        {!a.passed && <p className="text-red-600 mt-1">{a.message}</p>}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4 pt-2 text-xs text-gray-500">
                    <span className="text-green-600">{assertions.filter((a) => a.passed).length} passed</span>
                    <span className="text-red-600">{assertions.filter((a) => !a.passed).length} failed</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">No assertions</p>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="max-h-80 overflow-y-auto">
              {logs.filter((l) => l.level !== 'debug').map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono py-1 border-b border-gray-50 last:border-0">
                  <span className={`shrink-0 px-1 rounded text-[10px] font-medium ${log.level === 'error' ? 'bg-red-100 text-red-600' : log.level === 'warn' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-gray-400 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={log.level === 'error' ? 'text-red-600' : 'text-gray-600'}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
