// frontend/components/GeneratePlaywrightButton.jsx
// Button + modal for generating Playwright tests from approved scenarios
// Place next to your existing ExportCsvButton on the Story Detail page

import React, { useState } from 'react';

const API_BASE =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://testgenie-backend-production.up.railway.app';

const CATEGORY_OPTIONS = [
  { value: 'smoke', label: 'Smoke', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: 'regression', label: 'Regression', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'sanity', label: 'Sanity', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'critical_path', label: 'Critical Path', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'e2e', label: 'E2E', color: 'bg-purple-100 text-purple-700 border-purple-300' },
];

export default function GeneratePlaywrightButton({ projectId, storyIngestionId }) {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(['regression']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const toggle = (val) => {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleGenerate = async () => {
    if (selected.length === 0) {
      setError('Select at least one category tag.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${API_BASE}/api/projects/${projectId}/playwright/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storyIngestionId, categories: selected }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result?.id) return;

    const token = localStorage.getItem('accessToken');
    const res = await fetch(
      `${API_BASE}/api/projects/${projectId}/playwright/${result.id}/download`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      setError('Download failed');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.zipFileName || 'playwright-tests.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setShowModal(true); setResult(null); setError(null); }}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Generate Playwright Tests
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-surface-900 mb-1">
              Generate Playwright Tests
            </h3>
            <p className="text-sm text-surface-500 mb-4">
              Select category tags for the generated test suite.
            </p>

            {/* Category tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              {CATEGORY_OPTIONS.map((cat) => {
                const active = selected.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => toggle(cat.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? cat.color + ' ring-2 ring-offset-1 ring-current'
                        : 'bg-surface-50 text-surface-400 border-surface-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Success result */}
            {result && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                <p className="font-medium mb-1">Generation complete</p>
                <p>{result.testFileCount} files from {result.scenarioCount} scenarios</p>
                <p className="text-xs text-green-600 mt-1">
                  {(result.zipSizeBytes / 1024).toFixed(1)} KB
                </p>
                <button
                  onClick={handleDownload}
                  className="mt-2 inline-flex items-center gap-1 rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download ZIP
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-surface-600 hover:bg-surface-100"
              >
                {result ? 'Close' : 'Cancel'}
              </button>
              {!result && (
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-wait"
                >
                  {loading ? 'Generating…' : 'Generate'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
