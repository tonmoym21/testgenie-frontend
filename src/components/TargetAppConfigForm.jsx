import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AUTH_TYPES = [
  { value: 'none', label: 'None (public pages)' },
  { value: 'form_login', label: 'Form Login (username + password)' },
  { value: 'token', label: 'Bearer Token' },
  { value: 'storage_state', label: 'Playwright Storage State' },
  { value: 'basic_auth', label: 'HTTP Basic Auth' },
];

const SELECTOR_STRATEGIES = [
  { value: 'role_first', label: 'Role-first (getByRole → getByLabel → fallback)' },
  { value: 'testid_first', label: 'TestId-first (getByTestId → getByRole → fallback)' },
  { value: 'label_first', label: 'Label-first (getByLabel → getByRole → fallback)' },
  { value: 'css_fallback', label: 'CSS fallback (data-testid, name, id)' },
];

export default function TargetAppConfigForm({ projectId, existingConfig, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: 'Default',
    baseUrl: '',
    environment: 'staging',
    authType: 'none',
    loginUrl: '',
    authUsernameEnv: 'TEST_USERNAME',
    authPasswordEnv: 'TEST_PASSWORD',
    authTokenEnv: 'TEST_AUTH_TOKEN',
    selectorStrategy: 'role_first',
    knownTestids: '',
    isDefault: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existingConfig) {
      setForm({
        name: existingConfig.name || 'Default',
        baseUrl: existingConfig.base_url || '',
        environment: existingConfig.environment || 'staging',
        authType: existingConfig.auth_type || 'none',
        loginUrl: existingConfig.login_url || '',
        authUsernameEnv: existingConfig.auth_username_env || 'TEST_USERNAME',
        authPasswordEnv: existingConfig.auth_password_env || 'TEST_PASSWORD',
        authTokenEnv: existingConfig.auth_token_env || 'TEST_AUTH_TOKEN',
        selectorStrategy: existingConfig.selector_strategy || 'role_first',
        knownTestids: (existingConfig.known_testids || []).join(', '),
        isDefault: existingConfig.is_default !== false,
      });
    }
  }, [existingConfig]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        baseUrl: form.baseUrl,
        environment: form.environment,
        authType: form.authType,
        loginUrl: form.loginUrl || undefined,
        authUsernameEnv: form.authUsernameEnv || undefined,
        authPasswordEnv: form.authPasswordEnv || undefined,
        authTokenEnv: form.authTokenEnv || undefined,
        selectorStrategy: form.selectorStrategy,
        knownTestids: form.knownTestids ? form.knownTestids.split(',').map(s => s.trim()).filter(Boolean) : [],
        isDefault: form.isDefault,
      };

      let result;
      if (existingConfig) {
        result = await api.request(`/projects/${projectId}/target-app/${existingConfig.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        result = await api.request(`/projects/${projectId}/target-app`, { method: 'POST', body: JSON.stringify(payload) });
      }
      onSave?.(result);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const showAuthFields = form.authType !== 'none';
  const showFormLoginFields = form.authType === 'form_login' || form.authType === 'basic_auth';
  const showTokenField = form.authType === 'token';

  return (
    <div className="bg-surface-800 rounded-lg p-6 space-y-5">
      <h3 className="text-lg font-semibold text-white">
        {existingConfig ? 'Edit' : 'Add'} Target Application
      </h3>

      {error && <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-surface-400 mb-1">Config Name</label>
          <input className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" value={form.name} onChange={e => handleChange('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-surface-400 mb-1">Environment</label>
          <select className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" value={form.environment} onChange={e => handleChange('environment', e.target.value)}>
            <option value="local">Local</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
            <option value="test">Test</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-surface-400 mb-1">Base URL *</label>
        <input className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" placeholder="https://your-app.example.com" value={form.baseUrl} onChange={e => handleChange('baseUrl', e.target.value)} />
        <p className="text-xs text-surface-500 mt-1">The target application URL that Playwright tests will run against</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-surface-400 mb-1">Auth Type</label>
          <select className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" value={form.authType} onChange={e => handleChange('authType', e.target.value)}>
            {AUTH_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-surface-400 mb-1">Selector Strategy</label>
          <select className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" value={form.selectorStrategy} onChange={e => handleChange('selectorStrategy', e.target.value)}>
            {SELECTOR_STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {showAuthFields && (
        <div className="border border-surface-600 rounded p-4 space-y-3">
          <p className="text-sm text-yellow-400">Auth credentials are sourced from environment variables — never stored in generated tests.</p>
          {showFormLoginFields && (
            <>
              <div>
                <label className="block text-sm text-surface-400 mb-1">Login URL</label>
                <input className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" placeholder="/login" value={form.loginUrl} onChange={e => handleChange('loginUrl', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Username Env Var</label>
                  <input className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" value={form.authUsernameEnv} onChange={e => handleChange('authUsernameEnv', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-surface-400 mb-1">Password Env Var</label>
                  <input className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" value={form.authPasswordEnv} onChange={e => handleChange('authPasswordEnv', e.target.value)} />
                </div>
              </div>
            </>
          )}
          {showTokenField && (
            <div>
              <label className="block text-sm text-surface-400 mb-1">Token Env Var</label>
              <input className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" value={form.authTokenEnv} onChange={e => handleChange('authTokenEnv', e.target.value)} />
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm text-surface-400 mb-1">Known data-testid values (comma-separated)</label>
        <input className="w-full bg-surface-700 text-white rounded px-3 py-2 text-sm" placeholder="submit-btn, email-input, error-toast" value={form.knownTestids} onChange={e => handleChange('knownTestids', e.target.value)} />
        <p className="text-xs text-surface-500 mt-1">Only these test IDs will be used in generated tests. Leave empty to use role-first selectors.</p>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => handleChange('isDefault', e.target.checked)} className="rounded" />
        <label htmlFor="isDefault" className="text-sm text-surface-300">Set as default config for this project</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} disabled={saving || !form.baseUrl} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium">
          {saving ? 'Saving...' : existingConfig ? 'Update Config' : 'Create Config'}
        </button>
        {onCancel && <button onClick={onCancel} className="bg-surface-600 hover:bg-surface-500 text-white px-4 py-2 rounded text-sm">Cancel</button>}
      </div>
    </div>
  );
}
