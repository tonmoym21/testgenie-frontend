import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft, Loader2, CheckCircle, XCircle, Clock, Download, Mail,
  Globe, Monitor, Calendar, Folder, Play, AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';

function TestResultRow({ result, isExpanded, onToggle }) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div 
        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${
          isExpanded ? 'bg-gray-50' : ''
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {result.status === 'passed' ? (
            <CheckCircle size={18} className="text-green-500 shrink-0" />
          ) : result.status === 'error' ? (
            <AlertTriangle size={18} className="text-yellow-500 shrink-0" />
          ) : (
            <XCircle size={18} className="text-red-500 shrink-0" />
          )}
          <div>
            <p className="font-medium text-gray-700">{result.name}</p>
            {result.error && !isExpanded && (
              <p className="text-xs text-red-500 truncate max-w-md mt-0.5">{result.error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{result.duration || 0}ms</span>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            result.status === 'passed' ? 'bg-green-100 text-green-700' :
            result.status === 'error' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
          }`}>
            {result.status}
          </span>
          {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 bg-gray-50/50">
          {result.error && (
            <div className="mb-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <strong>Error:</strong> {result.error}
            </div>
          )}
          
          {result.rawResponse && (
            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">Response</p>
              <div className="p-3 bg-gray-100 rounded-lg text-xs font-mono overflow-x-auto">
                <div className="flex gap-4 mb-2">
                  <span className={`px-2 py-0.5 rounded ${
                    result.rawResponse.statusCode < 300 ? 'bg-green-200 text-green-800' :
                    result.rawResponse.statusCode < 400 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {result.rawResponse.statusCode} {result.rawResponse.statusText}
                  </span>
                  <span className="text-gray-500">{result.rawResponse.responseTime}ms</span>
                </div>
                {result.rawResponse.body && (
                  <pre className="max-h-40 overflow-auto text-gray-700">
                    {typeof result.rawResponse.body === 'object' 
                      ? JSON.stringify(result.rawResponse.body, null, 2) 
                      : result.rawResponse.body}
                  </pre>
                )}
              </div>
            </div>
          )}
          
          {result.assertionResults && result.assertionResults.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Assertions</p>
              <div className="space-y-1">
                {result.assertionResults.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded ${
                    a.passed ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {a.passed ? (
                      <CheckCircle size={14} className="text-green-500 mt-0.5" />
                    ) : (
                      <XCircle size={14} className="text-red-500 mt-0.5" />
                    )}
                    <span className="text-xs text-gray-700">{a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-3">
            Executed at {result.executedAt ? new Date(result.executedAt).toLocaleString() : 'N/A'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function RunReportDetailPage() {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTests, setExpandedTests] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.request('GET', `/run-reports/${reportId}`);
        setReport(data);
        // Auto-expand failed tests
        const expanded = {};
        (data.testResults || []).forEach((r, i) => {
          if (r.status !== 'passed') expanded[i] = true;
        });
        setExpandedTests(expanded);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [reportId]);

  const toggleExpand = (index) => {
    setExpandedTests(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const expandAll = () => {
    const expanded = {};
    (report?.testResults || []).forEach((_, i) => { expanded[i] = true; });
    setExpandedTests(expanded);
  };

  const collapseAll = () => setExpandedTests({});

  const handleSendEmail = async () => {
    const email = prompt('Enter email address:');
    if (!email) return;
    
    setSending(true);
    try {
      await api.request('POST', `/run-reports/${reportId}/send-email`, { email });
      alert('Report email sent!');
    } catch (err) {
      alert('Failed to send: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (format = 'json') => {
    try {
      const data = await api.request('GET', `/run-reports/${reportId}/download?format=${format}`);
      const blob = new Blob([format === 'json' ? JSON.stringify(data, null, 2) : data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">{error || 'Report not found'}</p>
        <Link to="/reports" className="text-brand-600 text-sm mt-2 inline-block">Back to reports</Link>
      </div>
    );
  }

  const passRate = report.totalTests > 0 
    ? Math.round((report.passedCount / report.totalTests) * 100) 
    : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to="/reports" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
        <ArrowLeft size={14} /> Back to Reports
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              {report.runType === 'api' ? <Globe size={20} className="text-purple-600" /> :
               report.runType === 'automation' ? <Monitor size={20} className="text-brand-600" /> :
               <Folder size={20} className="text-yellow-600" />}
              {report.title || 'Test Run Report'}
            </h1>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Play size={14} /> Triggered: {report.triggeredBy}
              </span>
              {report.environmentName && (
                <span className="flex items-center gap-1">
                  <Globe size={14} /> {report.environmentName}
                </span>
              )}
              {report.collectionName && (
                <span className="flex items-center gap-1">
                  <Folder size={14} /> {report.collectionName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={14} /> {(report.totalDurationMs / 1000).toFixed(2)}s
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSendEmail} disabled={sending} className="btn-secondary text-sm">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
              Email
            </button>
            <div className="relative group">
              <button className="btn-secondary text-sm">
                <Download size={14} /> Download
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg hidden group-hover:block z-10">
                <button onClick={() => handleDownload('json')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">JSON</button>
                <button onClick={() => handleDownload('csv')} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50">CSV</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-700">{report.totalTests}</p>
          <p className="text-sm text-gray-500">Total Tests</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{report.passedCount}</p>
          <p className="text-sm text-gray-500">Passed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{report.failedCount}</p>
          <p className="text-sm text-gray-500">Failed</p>
        </div>
        <div className="card p-4 text-center">
          <p className={`text-3xl font-bold ${passRate >= 80 ? 'text-green-600' : passRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {passRate}%
          </p>
          <p className="text-sm text-gray-500">Pass Rate</p>
        </div>
      </div>

      {/* Test Results */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold">Test Results</h3>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-xs text-brand-600 hover:text-brand-700">Expand All</button>
            <span className="text-gray-300">|</span>
            <button onClick={collapseAll} className="text-xs text-brand-600 hover:text-brand-700">Collapse All</button>
          </div>
        </div>
        <div>
          {report.testResults && report.testResults.length > 0 ? (
            report.testResults.map((result, i) => (
              <TestResultRow 
                key={i} 
                result={result} 
                isExpanded={expandedTests[i]} 
                onToggle={() => toggleExpand(i)} 
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-400">
              <p className="text-sm">No test results available</p>
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="card p-5 mt-6">
        <h3 className="font-semibold mb-3">Run Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Run Type:</span>
            <span className="ml-2 font-medium">{report.runType}</span>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <span className={`ml-2 font-medium ${report.status === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
              {report.status}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Started:</span>
            <span className="ml-2">{new Date(report.startedAt).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Completed:</span>
            <span className="ml-2">{report.completedAt ? new Date(report.completedAt).toLocaleString() : '-'}</span>
          </div>
          {report.environmentSnapshot && Object.keys(report.environmentSnapshot).length > 0 && (
            <div className="col-span-2">
              <span className="text-gray-500">Environment Variables:</span>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {Object.keys(report.environmentSnapshot).map(key => (
                    <span key={key} className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">{key}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
