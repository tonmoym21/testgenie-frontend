import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import Modal from './Modal';
import {
  Loader2, Sparkles, AlertCircle, ShieldAlert, FileJson, FileCode, Globe, Terminal, Cable,
} from 'lucide-react';

// The Universal Paste Box.
//
// One input. No format dropdown. The user pastes a URL, an OpenAPI spec, a
// Postman collection, a curl command — anything — and the modal calls
// /sources/preview with a 350ms debounce. The detected format, endpoint
// count, and first 25 endpoints animate in as the preview resolves; "Import"
// commits.

const FORMAT_ICONS = {
  openapi3: FileJson,
  openapi2: FileJson,
  postman21: FileCode,
  curl: Terminal,
  url_probe: Globe,
};

function FormatPill({ format, hint, count }) {
  const Icon = FORMAT_ICONS[format] || Cable;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium animate-fade-in">
      <Icon size={14} />
      <span>{hint || format}</span>
      {typeof count === 'number' && (
        <>
          <span className="text-brand-300">·</span>
          <span>{count} endpoint{count === 1 ? '' : 's'}</span>
        </>
      )}
    </div>
  );
}

export default function AddSourceModal({ onClose, onCreated }) {
  const [input, setInput] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const debounceRef = useRef();
  // Sequence number for in-flight preview requests. Out-of-order responses
  // (slow large spec resolves AFTER a faster subsequent paste) would otherwise
  // overwrite the latest valid preview. Each fire bumps the counter; the
  // landing handler discards itself when it's no longer the latest.
  const seqRef = useRef(0);

  const payload = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const isBareUrl = /^https?:\/\/\S+$/i.test(trimmed) && !trimmed.includes('\n');
    return isBareUrl ? { url: trimmed } : { raw: trimmed };
  }, [input]);

  useEffect(() => {
    if (!payload) {
      setPreview(null);
      setPreviewError('');
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const mySeq = ++seqRef.current;
      setPreviewing(true);
      setPreviewError('');
      try {
        const r = await api.request('POST', '/sources/preview', payload);
        if (mySeq !== seqRef.current) return; // a newer request took over
        setPreview(r);
        if (!nameTouched && r.name) setName(r.name);
      } catch (err) {
        if (mySeq !== seqRef.current) return;
        setPreview(null);
        setPreviewError(err.message || 'Could not parse input');
      } finally {
        if (mySeq === seqRef.current) setPreviewing(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [payload, nameTouched]);

  async function handleImport() {
    if (!preview || !payload) return;
    setImporting(true);
    setImportError('');
    try {
      const source = await api.request('POST', '/sources', { ...payload, name: name.trim() || undefined });
      onCreated(source);
    } catch (err) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const canImport = !!preview && !previewing && !importing && (preview.endpointCount > 0);
  const secretFindings = preview?.provenance?.secretFindings || [];

  // If the user has typed/pasted but not committed, confirm before closing
  // — avoids losing a long paste to an accidental backdrop click or Escape.
  function guardClose() {
    if (input.trim().length > 50 && !importing) {
      return window.confirm('Discard pasted content and close?');
    }
    return true;
  }

  return (
    <Modal
      title="Add API source"
      subtitle="Paste any URL, OpenAPI spec, Postman collection, or curl command."
      onClose={onClose}
      size="lg"
      guardClose={guardClose}
      footer={(
        <>
          <span className="text-xs text-surface-500 mr-auto">
            {preview ? `Will create ${preview.endpointCount} endpoints in the catalog` : ' '}
          </span>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleImport} disabled={!canImport} className="btn-primary">
            {importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : 'Import'}
          </button>
        </>
      )}
    >
      <div className="-mt-1 mb-1 flex items-center gap-2 text-xs text-brand-600">
        <Sparkles size={14} /> Auto-detects OpenAPI · Swagger · Postman · curl · URL probe
      </div>

      <div>
        <label htmlFor="source-input" className="label">Paste here</label>
        <textarea
          id="source-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`https://petstore.swagger.io/v2/swagger.json\n\n— or —\n\n{"openapi":"3.0.0", ...}\n\n— or —\n\ncurl -X POST https://api.example.com/users -H "..." -d '...'`}
          className="input font-mono text-xs min-h-[140px] resize-y"
          spellCheck={false}
        />
        <div className="mt-2 min-h-[28px] flex items-center gap-2">
          {previewing && (
            <span className="text-xs text-surface-500 flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin" /> Detecting…
            </span>
          )}
          {!previewing && preview && (
            <FormatPill
              format={preview.detected.format}
              hint={preview.detected.hint || preview.detected.format}
              count={preview.endpointCount}
            />
          )}
          {!previewing && previewError && (
            <span className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} /> {previewError}
            </span>
          )}
        </div>
      </div>

      {preview && (
        <>
          <div>
            <label htmlFor="source-name" className="label">Name</label>
            <input
              id="source-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameTouched(true); }}
              placeholder="e.g. Payments API (staging)"
              className="input"
            />
          </div>

          {secretFindings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-amber-900">
                  {secretFindings.length} potential secret{secretFindings.length === 1 ? '' : 's'} detected
                </div>
                <div className="text-amber-800 text-xs mt-1">
                  Found in: {secretFindings.slice(0, 5).map((f) => f.field || 'unknown').join(', ')}
                  {secretFindings.length > 5 ? `, +${secretFindings.length - 5} more` : ''}.
                  Values are replaced with placeholders before storage — set the real values as environment variables.
                </div>
              </div>
            </div>
          )}

          {preview.endpointsPreview && preview.endpointsPreview.length > 0 && (
            <div>
              <div className="text-xs text-surface-500 mb-2">
                Showing first {preview.endpointsPreview.length} of {preview.endpointCount} endpoints
              </div>
              <div className="border border-surface-200 rounded-lg divide-y max-h-64 overflow-y-auto">
                {preview.endpointsPreview.map((e, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-3 text-xs">
                    <span className={`badge ${methodBadgeClass(e.method)} w-14 justify-center`}>{e.method}</span>
                    <span className="font-mono text-surface-700 truncate flex-1">{e.path}</span>
                    {e.summary && <span className="text-surface-500 truncate max-w-[200px]">{e.summary}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {importError && (
            <div role="alert" className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200 flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {importError}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function methodBadgeClass(method) {
  switch ((method || '').toUpperCase()) {
    case 'GET':    return 'badge-info';
    case 'POST':   return 'badge-success';
    case 'PUT':
    case 'PATCH':  return 'badge-warn';
    case 'DELETE': return 'badge-danger';
    default:       return 'badge-muted';
  }
}
