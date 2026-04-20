import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  ExternalLink, Link2, Trash2, Plus, Loader2, CheckCircle, XCircle,
  RefreshCw, AlertTriangle, Search, X, RotateCcw,
} from 'lucide-react';

function JiraLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M11.53 2.03a.75.75 0 0 0-1.06 0L2.03 10.47a.75.75 0 0 0 0 1.06l9.47 9.47a.75.75 0 0 0 1.06 0l1.44-1.44-8.5-8.5 8.03-8.03-1.97-1.97-.03-.03Z" fill="#2684FF"/>
      <path d="M12.47 2.03a.75.75 0 0 1 1.06 0l8.44 8.44a.75.75 0 0 1 0 1.06l-9.47 9.47a.75.75 0 0 1-1.06 0l-1.44-1.44 8.5-8.5-8.03-8.03 1.97-1.97.03-.03Z" fill="#0052CC"/>
    </svg>
  );
}

function ConnectPanel({ onConnect }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { url } = await api.request('GET', '/jira/auth-url');
      window.location.href = url;
    } catch (err) {
      alert('Failed to start Jira OAuth: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="card p-8 text-center max-w-md mx-auto mt-16">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <JiraLogo />
      </div>
      <h2 className="text-xl font-semibold mb-2">Connect Jira</h2>
      <p className="text-gray-500 text-sm mb-6">
        Link your Atlassian Jira account to auto-attach test results to issues and sync run status.
      </p>
      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 mb-6 text-left space-y-1">
        <p className="font-medium text-gray-600 mb-2">What you get:</p>
        <p>• Link collections or tests to Jira issues</p>
        <p>• Push run results as comments automatically</p>
        <p>• View last run status per ticket</p>
      </div>
      <button onClick={handleConnect} disabled={loading} className="btn-primary w-full">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
        Connect with Atlassian
      </button>
    </div>
  );
}

function LinkRow({ link, onSync, onDelete }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try { await onSync(link.id); }
    finally { setSyncing(false); }
  };

  const statusColor = link.lastRunStatus === 'completed' ? 'text-green-600 bg-green-50'
    : link.lastRunStatus === 'failed' ? 'text-red-600 bg-red-50'
    : 'text-gray-500 bg-gray-100';

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 group">
      <td className="px-4 py-3">
        <a
          href={`https://jira.atlassian.com/browse/${link.issueKey}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {link.issueKey} <ExternalLink size={11} />
        </a>
        {link.issueSummary && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{link.issueSummary}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {link.collectionName || <span className="text-gray-300 italic">—</span>}
      </td>
      <td className="px-4 py-3">
        {link.lastRunStatus ? (
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor}`}>{link.lastRunStatus}</span>
        ) : <span className="text-xs text-gray-300">Never synced</span>}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {link.lastSyncedAt ? new Date(link.lastSyncedAt).toLocaleString() : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleSync} disabled={syncing} className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg" title="Sync latest result to Jira">
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
          <button onClick={() => onDelete(link.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Remove link">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddLinkModal({ onAdd, onClose }) {
  const [issueKey, setIssueKey] = useState('');
  const [issueSummary, setIssueSummary] = useState('');
  const [collections, setCollections] = useState([]);
  const [collectionId, setCollectionId] = useState('');
  const [syncResults, setSyncResults] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.request('GET', '/collections').then((d) => setCollections(d.data || [])).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await api.request('GET', `/jira/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.data || []);
    } finally {
      setSearching(false);
    }
  };

  const selectIssue = (issue) => {
    setIssueKey(issue.key);
    setIssueSummary(issue.summary || '');
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleAdd = async () => {
    if (!issueKey.trim()) { alert('Issue key is required'); return; }
    setSaving(true);
    try {
      await onAdd({ issueKey, issueSummary, collectionId: collectionId ? parseInt(collectionId) : undefined, syncResults });
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Link2 size={18} className="text-blue-600" /> Link Jira Issue</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Search issues */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Search Jira Issues</label>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input flex-1 text-sm"
                placeholder="PROJ-123 or search text…"
              />
              <button onClick={handleSearch} disabled={searching} className="btn-secondary text-sm">
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-auto">
                {searchResults.map((issue) => (
                  <button key={issue.key} onClick={() => selectIssue(issue)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <span className="font-mono text-xs text-blue-600 font-medium">{issue.key}</span>
                    <span className="text-sm text-gray-600 ml-2">{issue.summary}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual entry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Issue Key <span className="text-red-500">*</span></label>
              <input value={issueKey} onChange={(e) => setIssueKey(e.target.value.toUpperCase())} className="input text-sm font-mono" placeholder="PROJ-123" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Collection (optional)</label>
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} className="input text-sm">
                <option value="">None</option>
                {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="syncResults" checked={syncResults} onChange={(e) => setSyncResults(e.target.checked)} className="rounded border-gray-300 text-brand-600" />
            <label htmlFor="syncResults" className="text-sm text-gray-600">Auto-sync run results to Jira as comments</label>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleAdd} disabled={saving} className="btn-primary">
            {saving && <Loader2 size={14} className="animate-spin" />} Link Issue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JiraPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const justConnected = searchParams.get('connected') === '1';

  const load = async () => {
    try {
      const [statusData, linksData] = await Promise.all([
        api.request('GET', '/jira/status'),
        api.request('GET', '/jira/links'),
      ]);
      setStatus(statusData);
      setLinks(linksData.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Jira? All links will remain but syncing will stop.')) return;
    setDisconnecting(true);
    try {
      await api.request('DELETE', '/jira/disconnect');
      setStatus({ connected: false });
    } finally { setDisconnecting(false); }
  };

  const handleAddLink = async (data) => {
    await api.request('POST', '/jira/links', data);
    load();
  };

  const handleSync = async (linkId) => {
    await api.request('POST', `/jira/links/${linkId}/sync`);
    load();
  };

  const handleDelete = async (linkId) => {
    if (!confirm('Remove this Jira link?')) return;
    await api.request('DELETE', `/jira/links/${linkId}`);
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  };

  if (loading) return <div className="flex justify-center py-32"><Loader2 size={28} className="animate-spin text-brand-600" /></div>;

  if (!status?.connected) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold flex items-center gap-3 mb-2">
          <JiraLogo /> Jira Integration
        </h1>
        <p className="text-gray-500 text-sm mb-8">Connect Atlassian Jira to link test results with issues.</p>
        <ConnectPanel />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <JiraLogo /> Jira Integration
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle size={14} /> Connected
            </span>
            {status.jiraBaseUrl && <span className="text-xs text-gray-400">— {status.jiraBaseUrl}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {justConnected && (
            <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
              <CheckCircle size={14} /> Successfully connected!
            </div>
          )}
          <button onClick={() => setShowAddLink(true)} className="btn-primary"><Plus size={16} /> Link Issue</button>
          <button onClick={handleDisconnect} disabled={disconnecting} className="btn-secondary text-red-500 hover:text-red-600">
            {disconnecting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Disconnect
          </button>
        </div>
      </div>

      {/* Links table */}
      {links.length === 0 ? (
        <div className="text-center py-20">
          <Link2 size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-1">No Jira links yet</h3>
          <p className="text-sm text-gray-400 mb-6">Link a Jira issue to a collection to auto-sync test results</p>
          <button onClick={() => setShowAddLink(true)} className="btn-primary"><Plus size={16} /> Link Your First Issue</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Issue</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Collection</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Last Synced</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <LinkRow key={link.id} link={link} onSync={handleSync} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-xs text-gray-400">{links.length} link{links.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {showAddLink && <AddLinkModal onAdd={handleAddLink} onClose={() => setShowAddLink(false)} />}
    </div>
  );
}
