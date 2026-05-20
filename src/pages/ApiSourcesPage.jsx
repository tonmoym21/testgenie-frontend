import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AddSourceModal from '../components/AddSourceModal';
import { api } from '../services/api';
import {
  Plus, Cable, FileJson, FileCode, Globe, Terminal, RefreshCw, Trash2, X,
} from 'lucide-react';

// Friendly labels + icons for each source format. Adding a new adapter on
// the backend just means adding a row here — no behaviour change needed.
const FORMAT_META = {
  openapi3:  { label: 'OpenAPI 3',  icon: FileJson },
  openapi2:  { label: 'Swagger 2',  icon: FileJson },
  postman21: { label: 'Postman',    icon: FileCode },
  curl:      { label: 'curl',       icon: Terminal  },
  url_probe: { label: 'URL probe',  icon: Globe     },
};

function formatMeta(format) {
  return FORMAT_META[format] || { label: format || 'Unknown', icon: Cable };
}

function timeAgo(iso) {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ApiSourcesPage() {
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(null); // source id while refresh in flight

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.request('GET', '/sources');
      setSources(data.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load sources');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRefresh(sourceId) {
    setRefreshing(sourceId);
    setError('');
    try {
      const r = await api.request('POST', `/sources/${sourceId}/refresh`);
      if (r.changed) {
        // Reload so endpoint counts and timestamps reflect the new version.
        await load();
      }
    } catch (err) {
      setError(err.message || 'Refresh failed');
    } finally {
      setRefreshing(null);
    }
  }

  async function handleDelete(sourceId) {
    if (!window.confirm('Archive this source? Endpoints will no longer be importable. Existing tests are unaffected.')) return;
    try {
      await api.request('DELETE', `/sources/${sourceId}`);
      setSources((s) => s.filter((x) => x.id !== sourceId));
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">API Sources</h1>
            <p className="page-subtitle">
              Import APIs from OpenAPI specs, Postman collections, curl, or a bare URL — then pick the endpoints you want to turn into runnable tests.
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={16} /> Add source
          </button>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200 mb-6 flex items-start justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={16} /></button>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 flex items-center gap-4">
                <div className="skeleton w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/5" />
                  <div className="skeleton h-3 w-3/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sources.length === 0 && (
          <div className="empty">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
              <Cable size={24} />
            </div>
            <h3 className="text-lg font-semibold text-surface-800 mb-1">No API sources yet</h3>
            <p className="text-surface-500 text-sm mb-6 max-w-sm">
              Paste an OpenAPI URL, drop a Postman collection, or even a curl command. TestForge auto-detects the format and shows you every endpoint.
            </p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Add your first source
            </button>
          </div>
        )}

        {!loading && sources.length > 0 && (
          <div className="card divide-y">
            {sources.map((s) => {
              const meta = formatMeta(s.format);
              const Icon = meta.icon;
              return (
                <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50">
                  <Link to={`/sources/${s.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-800 truncate">{s.name}</span>
                        <span className="badge badge-muted">{meta.label}</span>
                      </div>
                      <div className="text-xs text-surface-500 mt-0.5 truncate">
                        {s.sourceUrl || 'pasted content'} · last fetched {timeAgo(s.lastFetchedAt || s.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm text-surface-600 whitespace-nowrap">
                      {s.endpointCount} endpoint{s.endpointCount === 1 ? '' : 's'}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRefresh(s.id)}
                      className="icon-btn"
                      title="Re-fetch + diff"
                      disabled={refreshing === s.id || !s.sourceUrl}
                    >
                      <RefreshCw size={16} className={refreshing === s.id ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="icon-btn text-red-500 hover:text-red-700"
                      title="Archive source"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddSourceModal
          onClose={() => setShowAdd(false)}
          onCreated={(source) => {
            setShowAdd(false);
            navigate(`/sources/${source.id}`);
          }}
        />
      )}
    </Layout>
  );
}
