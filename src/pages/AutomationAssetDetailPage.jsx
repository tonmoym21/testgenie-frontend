import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Loader2, Play, CheckCircle, XCircle, Clock, Tag, FileCode, ShieldCheck, AlertTriangle, Settings2, Save, ChevronDown, ChevronRight, MapPin } from 'lucide-react';

const ALL_CATEGORIES = ['smoke', 'sanity', 'regression', 'e2e', 'critical_path', 'ui', 'api', 'p0', 'p1', 'p2'];
const RUN_STATUS_BADGE = { passed: 'bg-green-100 text-green-700', failed: 'bg-red-100 text-red-700', running: 'bg-blue-100 text-blue-700 animate-pulse', queued: 'bg-gray-100 text-gray-600', cancelled: 'bg-yellow-100 text-yellow-700' };
const READINESS_BADGE = { draft: 'bg-gray-100 text-gray-500', needs_selector_mapping: 'bg-yellow-100 text-yellow-700', ready: 'bg-blue-100 text-blue-700', validated: 'bg-green-100 text-green-700' };

const AUTH_TYPES = [
  { value: 'none', label: 'None (public pages)' },
  { value: 'form_login', label: 'Form Login' },
  { value: 'token', label: 'Bearer Token' },
  { value: 'storage_state', label: 'Storage State' },
  { value: 'basic_auth', label: 'HTTP Basic Auth' },
];

const ENV_VAR_PATTERN = /^[A-Z][A-Z0-9_]{1,127}$/;

function isValidEnvVar(val) {
  if (!val) return true; // empty is OK (field is optional)
  return ENV_VAR_PATTERN.test(val.trim());
}

// Default selector map keys for login flow
const DEFAULT_SELECTOR_KEYS = [
  { key: 'usernameField', label: 'Username / Email Field', placeholder: "getByLabel('Email') or getByPlaceholder('Enter email')" },
  { key: 'passwordField', label: 'Password Field', placeholder: "getByLabel('Password')" },
  { key: 'loginButton', label: 'Login / Submit Button', placeholder: "getByRole('button', { name: 'Sign in' })" },
  { key: 'successIndicator', label: 'Post-Login Success Element', placeholder: "getByRole('heading', { name: 'Dashboard' })" },
  { key: 'errorIndicator', label: 'Error Message Element (optional)', placeholder: "getByRole('alert') or getByText('Invalid credentials')" },
];

// ---------------------------------------------------------------------------
// Prerequisites Setup Panel (inline)
// ---------------------------------------------------------------------------
function PrerequisitesPanel({ projectId, asset, onSaved }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(asset.target_app_config_id || '');
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectorMapOpen, setSelectorMapOpen] = useState(false);

  const [form, setForm] = useState({
    name: 'Default', baseUrl: '', environment: 'staging', authType: 'none',
    loginUrl: '', authUsernameEnv: '', authPasswordEnv: '',
    authTokenEnv: '', selectorStrategy: 'role_first', knownTestids: '',
    selectorMap: {}, isDefault: true,
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const list = await api.request('GET', `/projects/${projectId}/target-app`);
        setConfigs(Array.isArray(list) ? list : []);
        if (asset.target_app_config_id) {
          setSelectedConfigId(asset.target_app_config_id);
          const existing = (Array.isArray(list) ? list : []).find(c => c.id === asset.target_app_config_id);
          if (existing) populateForm(existing);
        } else if (list.length > 0) {
          setSelectedConfigId(list[0].id);
          populateForm(list[0]);
        } else {
          setShowNew(true);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [open, projectId]);

  function parseSelectorMap(raw) {
    if (!raw) return {};
    if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
    return raw;
  }

  function parseKnownTestids(raw) {
    if (!raw) return '';
    if (typeof raw === 'string') { try { return JSON.parse(raw).join(', '); } catch { return raw; } }
    if (Array.isArray(raw)) return raw.join(', ');
    return '';
  }

  function populateForm(cfg) {
    setForm({
      name: cfg.name || 'Default', baseUrl: cfg.base_url || '', environment: cfg.environment || 'staging',
      authType: cfg.auth_type || 'none', loginUrl: cfg.login_url || '',
      authUsernameEnv: cfg.auth_username_env || '', authPasswordEnv: cfg.auth_password_env || '',
      authTokenEnv: cfg.auth_token_env || '', selectorStrategy: cfg.selector_strategy || 'role_first',
      knownTestids: parseKnownTestids(cfg.known_testids),
      selectorMap: parseSelectorMap(cfg.selector_map),
      isDefault: cfg.is_default !== false,
    });
    setErrors({});
  }

  const handleSelectConfig = (id) => {
    setSelectedConfigId(id);
    setShowNew(false);
    const cfg = configs.find(c => c.id === Number(id));
    if (cfg) populateForm(cfg);
  };

  function validate() {
    const e = {};
    if (!form.baseUrl) e.baseUrl = 'Required';
    if ((form.authType === 'form_login' || form.authType === 'basic_auth')) {
      if (form.authUsernameEnv && !isValidEnvVar(form.authUsernameEnv)) {
        e.authUsernameEnv = 'Must be UPPER_SNAKE_CASE (e.g. TEST_USERNAME), not a raw credential';
      }
      if (form.authPasswordEnv && !isValidEnvVar(form.authPasswordEnv)) {
        e.authPasswordEnv = 'Must be UPPER_SNAKE_CASE (e.g. TEST_PASSWORD), not a raw secret';
      }
    }
    if (form.authType === 'token' && form.authTokenEnv && !isValidEnvVar(form.authTokenEnv)) {
      e.authTokenEnv = 'Must be UPPER_SNAKE_CASE (e.g. AUTH_TOKEN)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const knownTestidsArr = form.knownTestids ? form.knownTestids.split(',').map(s => s.trim()).filter(Boolean) : [];
      // Filter out empty selector map entries — backend requires min 1 char per value
      const selectorMap = Object.fromEntries(
        Object.entries(form.selectorMap || {}).filter(([, v]) => v && v.trim())
      );

      let saved;
      if (showNew || !selectedConfigId) {
        saved = await api.request('POST', `/projects/${projectId}/target-app`, {
          name: form.name, baseUrl: form.baseUrl, environment: form.environment,
          authType: form.authType, loginUrl: form.loginUrl || undefined,
          authUsernameEnv: form.authUsernameEnv || undefined,
          authPasswordEnv: form.authPasswordEnv || undefined,
          authTokenEnv: form.authTokenEnv || undefined,
          selectorStrategy: form.selectorStrategy,
          selectorMap, knownTestids: knownTestidsArr, isDefault: form.isDefault,
        });
      } else {
        saved = await api.request('PATCH', `/projects/${projectId}/target-app/${selectedConfigId}`, {
          name: form.name, base_url: form.baseUrl, environment: form.environment,
          auth_type: form.authType, login_url: form.loginUrl || null,
          auth_username_env: form.authUsernameEnv || null,
          auth_password_env: form.authPasswordEnv || null,
          auth_token_env: form.authTokenEnv || null,
          selector_strategy: form.selectorStrategy,
          selector_map: selectorMap, known_testids: knownTestidsArr,
          is_default: form.isDefault,
        });
      }

      // Link config to the asset
      const configId = saved.id || selectedConfigId;
      if (configId) {
        await api.request('PATCH', `/projects/${projectId}/automation/assets/${asset.id}`, {
          target_app_config_id: Number(configId),
        });
      }

      onSaved?.(configId);
    } catch (err) {
      const msg = err.details
        ? JSON.stringify(err.details)
        : err.message;
      alert('Save failed: ' + msg);
    } finally { setSaving(false); }
  };

  const ch = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };
  const chSelector = (key, value) => setForm(prev => ({ ...prev, selectorMap: { ...prev.selectorMap, [key]: value } }));

  const showAuthFields = form.authType !== 'none';
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase hover:text-brand-600 w-full">
        <Settings2 size={14} className="text-gray-400" />
        Prerequisites Setup
        {open ? <ChevronDown size={14} className="ml-auto" /> : <ChevronRight size={14} className="ml-auto" />}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-brand-600" /></div>
          ) : (
            <>
              {/* Config selector */}
              {configs.length > 0 && !showNew && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Existing Target App Config</label>
                    <select value={selectedConfigId} onChange={(e) => handleSelectConfig(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none">
                      {configs.map(c => <option key={c.id} value={c.id}>{c.name} — {c.base_url}</option>)}
                    </select>
                  </div>
                  <button onClick={() => { setShowNew(true); setSelectedConfigId(''); setForm(f => ({ ...f, name: '', baseUrl: '', selectorMap: {} })); }}
                    className="text-xs text-brand-600 hover:underline whitespace-nowrap pb-2">+ New Config</button>
                </div>
              )}

              {/* Form */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Config Name</label>
                  <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.name} onChange={e => ch('name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Environment</label>
                  <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.environment} onChange={e => ch('environment', e.target.value)}>
                    <option value="local">Local</option><option value="staging">Staging</option>
                    <option value="production">Production</option><option value="test">Test</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Base URL <span className="text-red-400">*</span></label>
                <input className={`w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none ${errors.baseUrl ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  placeholder="https://your-app.example.com" value={form.baseUrl} onChange={e => ch('baseUrl', e.target.value)} />
                {errors.baseUrl && <p className="text-[10px] text-red-500 mt-0.5">{errors.baseUrl}</p>}
                <p className="text-[10px] text-gray-400 mt-0.5">The URL Playwright tests will run against</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Auth Type</label>
                  <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.authType} onChange={e => ch('authType', e.target.value)}>
                    {AUTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Selector Strategy</label>
                  <select className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={form.selectorStrategy} onChange={e => ch('selectorStrategy', e.target.value)}>
                    <option value="role_first">Role-first (recommended)</option><option value="testid_first">TestId-first</option>
                    <option value="label_first">Label-first</option><option value="css_fallback">CSS fallback</option>
                  </select>
                </div>
              </div>

              {showAuthFields && (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] text-yellow-700 font-medium">
                    Enter the <strong>names</strong> of environment variables (e.g. <code className="bg-yellow-100 px-1 rounded">TEST_USERNAME</code>), not the actual credentials. Playwright reads them at runtime via <code className="bg-yellow-100 px-1 rounded">process.env</code>.
                  </p>
                  {(form.authType === 'form_login' || form.authType === 'basic_auth') && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Login URL</label>
                        <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          placeholder="https://your-app.example.com/login" value={form.loginUrl} onChange={e => ch('loginUrl', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Username Env Var Name</label>
                          <input className={`w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono ${errors.authUsernameEnv ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                            placeholder="TEST_USERNAME" value={form.authUsernameEnv} onChange={e => ch('authUsernameEnv', e.target.value)} />
                          {errors.authUsernameEnv && <p className="text-[10px] text-red-500 mt-0.5">{errors.authUsernameEnv}</p>}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Password Env Var Name</label>
                          <input className={`w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono ${errors.authPasswordEnv ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                            placeholder="TEST_PASSWORD" value={form.authPasswordEnv} onChange={e => ch('authPasswordEnv', e.target.value)} />
                          {errors.authPasswordEnv && <p className="text-[10px] text-red-500 mt-0.5">{errors.authPasswordEnv}</p>}
                        </div>
                      </div>
                    </>
                  )}
                  {form.authType === 'token' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Token Env Var Name</label>
                      <input className={`w-full text-sm border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono ${errors.authTokenEnv ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                        placeholder="AUTH_BEARER_TOKEN" value={form.authTokenEnv} onChange={e => ch('authTokenEnv', e.target.value)} />
                      {errors.authTokenEnv && <p className="text-[10px] text-red-500 mt-0.5">{errors.authTokenEnv}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Selector Map — structured fields for login flow */}
              <div className="border border-gray-200 rounded-lg">
                <button onClick={() => setSelectorMapOpen(!selectorMapOpen)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-gray-500 uppercase hover:text-brand-600">
                  <MapPin size={13} className="text-gray-400" />
                  Selector Mapping (Login Flow)
                  {selectorMapOpen ? <ChevronDown size={13} className="ml-auto" /> : <ChevronRight size={13} className="ml-auto" />}
                  {Object.values(form.selectorMap).filter(Boolean).length > 0 && (
                    <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                      {Object.values(form.selectorMap).filter(Boolean).length} mapped
                    </span>
                  )}
                </button>
                {selectorMapOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                    <p className="text-[10px] text-gray-400">
                      Map logical element names to Playwright locators. These are used during test generation and readiness validation.
                    </p>
                    {DEFAULT_SELECTOR_KEYS.map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="block text-[11px] text-gray-500 mb-0.5">{label}</label>
                        <input
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                          placeholder={placeholder}
                          value={form.selectorMap[key] || ''}
                          onChange={e => chSelector(key, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Known data-testid values (comma-separated)</label>
                <input className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="submit-btn, email-input, error-toast" value={form.knownTestids} onChange={e => ch('knownTestids', e.target.value)} />
                <p className="text-[10px] text-gray-400 mt-0.5">Verified data-testid attributes from your app. Leave empty to use role-first selectors.</p>
              </div>

              <button onClick={handleSave} disabled={saving || !form.baseUrl || hasErrors}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {showNew ? 'Create & Link Config' : 'Save & Link Config'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AutomationAssetDetailPage() {
  const { projectId, assetId } = useParams();
  const [asset, setAsset] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [editingCats, setEditingCats] = useState(false);
  const [cats, setCats] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [preflight, setPreflight] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, r, rd] = await Promise.all([
        api.getAutomationAsset(projectId, assetId),
        api.getAutomationRuns(projectId, assetId, { limit: 20 }),
        api.getReadiness(projectId, assetId).catch(() => null),
      ]);
      setAsset(a);
      setCats(a.categories || []);
      setRuns(r.data);
      if (rd) setReadiness(rd);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [projectId, assetId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!runs.some(r => r.status === 'running' || r.status === 'queued')) return;
    const interval = setInterval(async () => {
      try {
        const r = await api.getAutomationRuns(projectId, assetId, { limit: 20 });
        setRuns(r.data);
        const a = await api.getAutomationAsset(projectId, assetId);
        setAsset(a);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [runs, projectId, assetId]);

  const handleVerifyReadiness = async () => {
    setVerifyLoading(true);
    setPreflight(null);
    try {
      const result = await api.verifyReadiness(projectId, assetId);
      setReadiness({ validation: result.validation, executionReadiness: result.validation.validation_status === 'passed' ? 'validated' : 'draft' });
      setPreflight(result.preflight);
      const a = await api.getAutomationAsset(projectId, assetId);
      setAsset(a);
    } catch (err) { alert('Verification failed: ' + err.message); }
    finally { setVerifyLoading(false); }
  };

  const isExecutionReady = asset?.execution_readiness === 'validated' || readiness?.validation?.validation_status === 'passed';

  const handleRun = async () => {
    if (!isExecutionReady) { alert('Please verify readiness before running.'); return; }
    setRunLoading(true);
    try {
      await api.runAutomationAsset(projectId, assetId, { browser: 'chromium' });
      setTimeout(load, 1500);
    } catch (err) {
      if (err.code === 'PREFLIGHT_FAILED') { setPreflight(err.preflight); alert('Readiness check failed. Fix blockers before running.'); }
      else alert('Run failed: ' + err.message);
    } finally { setRunLoading(false); }
  };

  const handleSaveCats = async () => {
    try { await api.updateAutomationAsset(projectId, assetId, { categories: cats }); setEditingCats(false); load(); }
    catch (err) { alert(err.message); }
  };

  const handlePrereqSaved = async () => {
    await load();
    // Auto-verify after saving prerequisites
    setTimeout(handleVerifyReadiness, 500);
  };

  const toggleCat = (c) => setCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  if (loading) return <div className="flex justify-center py-32"><Loader2 size={24} className="animate-spin text-brand-600" /></div>;
  if (!asset) return <div className="p-8 text-center text-gray-500">Asset not found</div>;

  const manifest = typeof asset.generated_files_manifest === 'string'
    ? JSON.parse(asset.generated_files_manifest) : asset.generated_files_manifest || [];
  const validation = readiness?.validation;
  const checks = validation ? (typeof validation.checks === 'string' ? JSON.parse(validation.checks) : validation.checks || []) : [];
  const blockers = validation ? (typeof validation.failure_reasons === 'string' ? JSON.parse(validation.failure_reasons) : validation.failure_reasons || []) : [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link to={`/projects/${projectId}/automation`} className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
        <ArrowLeft size={14} /> Back to Automation Library
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{asset.name}</h1>
            {asset.description && <p className="text-gray-500 text-sm mt-1">{asset.description}</p>}
            <div className="flex gap-4 mt-3 text-xs text-gray-400">
              <span>{manifest.length} test files</span>
              <span>{asset.framework} / {asset.language}</span>
              <span>Created {new Date(asset.created_at).toLocaleDateString()}</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${READINESS_BADGE[asset.execution_readiness] || READINESS_BADGE.draft}`}>
                {asset.execution_readiness}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleVerifyReadiness} disabled={verifyLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-300 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50">
              {verifyLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Verify Readiness
            </button>
            <button onClick={handleRun} disabled={runLoading || !isExecutionReady}
              title={!isExecutionReady ? 'Verify readiness first' : 'Run tests'}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed">
              {runLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Run Now
            </button>
          </div>
        </div>

        {/* Readiness Checklist */}
        {(checks.length > 0 || blockers.length > 0 || preflight) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">Readiness Checklist</span>
              {validation && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
                  validation.validation_status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>{validation.validation_status === 'passed' ? 'Ready' : 'Blocked'}</span>
              )}
            </div>
            <div className="space-y-1.5">
              {(preflight?.checks || checks).map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle size={12} className="text-green-500 shrink-0" />
                  <span className="text-gray-600">{c.name?.replace(/_/g, ' ')}</span>
                  <span className="text-gray-400 ml-auto truncate max-w-xs">{c.detail}</span>
                </div>
              ))}
              {(preflight?.blockers || blockers).map((b, i) => (
                <div key={`b-${i}`} className="flex items-start gap-2 text-xs">
                  {b.status === 'fail'
                    ? <XCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                    : <AlertTriangle size={12} className="text-yellow-500 shrink-0 mt-0.5" />}
                  <div>
                    <span className="text-gray-700 font-medium">{b.name?.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500 ml-1">{b.detail}</span>
                  </div>
                </div>
              ))}
            </div>
            {validation?.verified_at && (
              <p className="text-[10px] text-gray-400 mt-2">Last verified: {new Date(validation.verified_at).toLocaleString()}</p>
            )}
          </div>
        )}

        {/* Prerequisites Setup (collapsible) */}
        <PrerequisitesPanel projectId={projectId} asset={asset} onSaved={handlePrereqSaved} />

        {/* Categories */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">Categories</span>
            <button onClick={() => setEditingCats(!editingCats)} className="text-xs text-brand-600 hover:underline ml-auto">
              {editingCats ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingCats ? (
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {ALL_CATEGORIES.map(c => (
                  <button key={c} onClick={() => toggleCat(c)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${cats.includes(c) ? 'bg-brand-50 text-brand-700 border-brand-300 ring-1 ring-brand-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>{c}</button>
                ))}
              </div>
              <button onClick={handleSaveCats} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700">Save Categories</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {(asset.categories || []).length > 0
                ? asset.categories.map(c => <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c}</span>)
                : <span className="text-xs text-gray-300">No categories assigned</span>}
            </div>
          )}
        </div>

        {/* Files */}
        {manifest.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <FileCode size={14} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500 uppercase">Test Files</span>
            </div>
            <div className="space-y-1">
              {manifest.map((f, i) => <div key={i} className="text-xs text-gray-600 font-mono bg-gray-50 rounded px-2 py-1">tests/{f.fileName || f}</div>)}
            </div>
          </div>
        )}
      </div>

      {/* Run History */}
      <h2 className="text-lg font-semibold mb-3">Run History</h2>
      {runs.length === 0 ? (
        <div className="card p-8 text-center">
          <Clock size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No runs yet. Set up prerequisites, verify readiness, then run.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((run) => (
            <div key={run.id} onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
              className="card p-4 cursor-pointer hover:border-brand-300 hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {run.status === 'passed' ? <CheckCircle size={16} className="text-green-500" /> :
                   run.status === 'failed' ? <XCircle size={16} className="text-red-500" /> :
                   <Clock size={16} className="text-gray-400" />}
                  <div>
                    <span className="text-sm font-medium">Run #{run.id}</span>
                    <span className="text-xs text-gray-400 ml-3">{new Date(run.created_at).toLocaleString()}</span>
                    {run.run_type === 'bulk' && <span className="text-[10px] ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">bulk</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {run.duration_ms && <span className="text-xs text-gray-400">{(run.duration_ms / 1000).toFixed(1)}s</span>}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RUN_STATUS_BADGE[run.status] || ''}`}>{run.status}</span>
                </div>
              </div>
              {run.total_tests > 0 && (
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span className="text-green-600">{run.passed_tests} passed</span>
                  <span className="text-red-600">{run.failed_tests} failed</span>
                  {run.skipped_tests > 0 && <span className="text-yellow-600">{run.skipped_tests} skipped</span>}
                  <span>Total: {run.total_tests}</span>
                </div>
              )}
              {selectedRun?.id === run.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {run.error_summary && <div className="mb-3 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg border border-red-200">{run.error_summary}</div>}
                  {run.output_logs && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">Output Logs</h4>
                      <pre className="text-[11px] font-mono bg-gray-900 text-gray-100 rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap">{run.output_logs}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
