import GeneratePlaywrightButton from '../components/GeneratePlaywrightButton';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStory, listScenarios, updateScenarioStatus, createScenario, getCoverage, exportStoryCsv, listManualTestCases, createManualTestCase, deleteManualTestCase } from '../services/storyApi';

var CATEGORY_LABELS = {
  happy_path: 'Happy Path', negative: 'Negative', edge: 'Edge Cases', validation: 'Validation',
  role_permission: 'Role / Permission', state_transition: 'State Transition', api_impact: 'API Impact', non_functional: 'Non-Functional',
};

const VALID_CATEGORIES = ['happy_path', 'negative', 'edge', 'validation', 'role_permission', 'state_transition', 'api_impact', 'non_functional'];
const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

export default function StoryDetailPage() {
  var params = useParams();
  var projectId = params.projectId, storyId = params.storyId;
  var [story, setStory] = useState(null);
  var [scenarios, setScenarios] = useState([]);
  var [coverage, setCoverage] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [exporting, setExporting] = useState(false);
  var [exportMsg, setExportMsg] = useState(null);

  // Tab state: 'ai' | 'manual'
  var [activeTab, setActiveTab] = useState('ai');

  // Manual test cases state
  var [manualTcs, setManualTcs] = useState([]);
  var [manualLoading, setManualLoading] = useState(false);
  var [showManualForm, setShowManualForm] = useState(false);
  var [manualForm, setManualForm] = useState({ title: '', content: '', priority: 'medium' });
  var [manualSaving, setManualSaving] = useState(false);
  var [manualError, setManualError] = useState('');

  // Manual AI scenario creation state
  var [showAddModal, setShowAddModal] = useState(false);
  var [addForm, setAddForm] = useState({ category: 'happy_path', title: '', summary: '', preconditions: '', test_intent: '', expected_outcome: '', priority: 'P1' });
  var [addError, setAddError] = useState('');
  var [addSaving, setAddSaving] = useState(false);

  var loadData = useCallback(async function() {
    try {
      setLoading(true); setError(null);
      var results = await Promise.all([getStory(projectId, storyId), listScenarios(projectId, storyId), getCoverage(projectId, storyId)]);
      setStory(results[0]); setScenarios(results[1]); setCoverage(results[2]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId, storyId]);

  useEffect(function() { loadData(); }, [loadData]);

  var loadManualTcs = useCallback(async function() {
    setManualLoading(true);
    try {
      var data = await listManualTestCases(projectId, storyId);
      setManualTcs(Array.isArray(data) ? data : []);
    } catch (err) { setManualError(err.message); }
    finally { setManualLoading(false); }
  }, [projectId, storyId]);

  useEffect(function() {
    if (activeTab === 'manual') loadManualTcs();
  }, [activeTab, loadManualTcs]);

  async function handleAddManualTc(e) {
    e.preventDefault();
    setManualSaving(true); setManualError('');
    try {
      var created = await createManualTestCase(projectId, storyId, manualForm);
      setManualTcs(function(prev) { return [created].concat(prev); });
      setShowManualForm(false);
      setManualForm({ title: '', content: '', priority: 'medium' });
    } catch (err) { setManualError(err.message); }
    finally { setManualSaving(false); }
  }

  async function handleDeleteManualTc(tcId) {
    if (!window.confirm('Delete this test case?')) return;
    try {
      await deleteManualTestCase(projectId, storyId, tcId);
      setManualTcs(function(prev) { return prev.filter(function(t) { return t.id !== tcId; }); });
    } catch (err) { alert('Delete failed: ' + err.message); }
  }

  async function handleStatusChange(scenarioId, newStatus) {
    try {
      var updated = await updateScenarioStatus(projectId, storyId, scenarioId, newStatus);
      setScenarios(function(prev) { return prev.map(function(s) { return s.id === scenarioId ? updated : s; }); });
      var cov = await getCoverage(projectId, storyId);
      setCoverage(cov);
    } catch (err) { alert('Failed: ' + err.message); }
  }

  async function handleAddScenario(e) {
    e.preventDefault();
    setAddError('');
    setAddSaving(true);
    try {
      var preconditionsArr = addForm.preconditions
        .split('\n')
        .map(function(s) { return s.trim(); })
        .filter(Boolean);
      var created = await createScenario(projectId, storyId, {
        category: addForm.category,
        title: addForm.title,
        summary: addForm.summary,
        preconditions: preconditionsArr,
        test_intent: addForm.test_intent,
        expected_outcome: addForm.expected_outcome,
        priority: addForm.priority,
      });
      setScenarios(function(prev) { return prev.concat(created); });
      var cov = await getCoverage(projectId, storyId);
      setCoverage(cov);
      setShowAddModal(false);
      setAddForm({ category: 'happy_path', title: '', summary: '', preconditions: '', test_intent: '', expected_outcome: '', priority: 'P1' });
    } catch (err) {
      setAddError(err.message || 'Failed to add scenario');
    } finally {
      setAddSaving(false);
    }
  }

  async function handleBulkAction(category, newStatus) {
    var targets = scenarios.filter(function(s) { return s.category === category && s.status !== newStatus; });
    for (var i = 0; i < targets.length; i++) {
      await handleStatusChange(targets[i].id, newStatus);
    }
  }

  async function handleExport() {
    try {
      setExporting(true); setExportMsg(null);
      var result = await exportStoryCsv(projectId, storyId);
      setExportMsg('Downloaded: ' + result.filename);
    } catch (err) { setExportMsg('Error: ' + err.message); }
    finally { setExporting(false); }
  }

  if (loading) return React.createElement('div', { style: { textAlign: 'center', padding: '40px', color: '#6b7280' } }, 'Loading story...');
  if (error) return React.createElement('div', { style: { textAlign: 'center', padding: '40px', color: '#dc2626' } }, 'Error: ' + error);
  if (!story) return React.createElement('div', { style: { textAlign: 'center', padding: '40px', color: '#6b7280' } }, 'Story not found');

  var approvedCount = scenarios.filter(function(s) { return s.status === 'approved'; }).length;
  var pendingCount = scenarios.filter(function(s) { return s.status === 'pending'; }).length;
  var rejectedCount = scenarios.filter(function(s) { return s.status === 'rejected'; }).length;
  var canExport = approvedCount > 0;

  var grouped = {};
  scenarios.forEach(function(s) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  return React.createElement('div', { style: { maxWidth: '800px', margin: '0 auto', padding: '24px' } },
    React.createElement(Link, { to: '/projects/' + projectId + '/stories', style: { color: '#2563eb', textDecoration: 'none', fontSize: '14px' } }, '\u2190 Back to Stories'),
    React.createElement('h1', { style: { fontSize: '22px', fontWeight: '700', margin: '8px 0 4px' } }, story.title),
    React.createElement('p', { style: { color: '#4b5563', fontSize: '14px', margin: '0 0 16px', lineHeight: '1.6', whiteSpace: 'pre-wrap' } }, story.description),

    // Tab switcher
    React.createElement('div', { style: { display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb', marginBottom: '20px' } },
      React.createElement('button', {
        onClick: function() { setActiveTab('ai'); },
        style: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', border: 'none', background: 'none', cursor: 'pointer',
          borderBottom: activeTab === 'ai' ? '2px solid #2563eb' : '2px solid transparent',
          color: activeTab === 'ai' ? '#2563eb' : '#6b7280', marginBottom: '-2px' }
      }, '🤖 AI Scenarios (' + scenarios.length + ')'),
      React.createElement('button', {
        onClick: function() { setActiveTab('manual'); },
        style: { padding: '10px 20px', fontSize: '14px', fontWeight: '600', border: 'none', background: 'none', cursor: 'pointer',
          borderBottom: activeTab === 'manual' ? '2px solid #2563eb' : '2px solid transparent',
          color: activeTab === 'manual' ? '#2563eb' : '#6b7280', marginBottom: '-2px' }
      }, '✍️ Manual Test Cases (' + manualTcs.length + ')')
    ),

    // ── MANUAL TEST CASES TAB ──────────────────────────────────────────────
    activeTab === 'manual' && React.createElement('div', null,
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
        React.createElement('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0 } }, 'Manual test cases written specifically for this story, visible to your whole organisation.'),
        React.createElement('button', {
          onClick: function() { setShowManualForm(true); },
          style: { backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }
        }, '+ Add Test Case')
      ),

      // Add manual test case form
      showManualForm && React.createElement('div', { style: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '16px' } },
        React.createElement('h3', { style: { fontSize: '15px', fontWeight: '600', marginBottom: '14px' } }, 'New Manual Test Case'),
        React.createElement('form', { onSubmit: handleAddManualTc },
          React.createElement('div', { style: { marginBottom: '12px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' } }, 'Title *'),
            React.createElement('input', {
              value: manualForm.title, required: true,
              placeholder: 'E.g. User can log in with valid credentials',
              onChange: function(e) { setManualForm(function(f) { return Object.assign({}, f, { title: e.target.value }); }); },
              style: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }
            })
          ),
          React.createElement('div', { style: { marginBottom: '12px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' } }, 'Test Steps / Content *'),
            React.createElement('textarea', {
              value: manualForm.content, required: true, rows: 5,
              placeholder: 'Step 1: Navigate to login page\nStep 2: Enter valid credentials\nStep 3: Click Submit\nExpected: User is redirected to dashboard',
              onChange: function(e) { setManualForm(function(f) { return Object.assign({}, f, { content: e.target.value }); }); },
              style: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }
            })
          ),
          React.createElement('div', { style: { marginBottom: '14px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' } }, 'Priority'),
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
              ['low', 'medium', 'high', 'critical'].map(function(p) {
                var colors = { low: '#6b7280', medium: '#d97706', high: '#ea580c', critical: '#dc2626' };
                var active = manualForm.priority === p;
                return React.createElement('button', {
                  key: p, type: 'button',
                  onClick: function() { setManualForm(function(f) { return Object.assign({}, f, { priority: p }); }); },
                  style: { padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    border: '1px solid ' + (active ? colors[p] : '#d1d5db'),
                    backgroundColor: active ? colors[p] : '#fff',
                    color: active ? '#fff' : '#6b7280', textTransform: 'capitalize' }
                }, p);
              })
            )
          ),
          manualError && React.createElement('p', { style: { color: '#dc2626', fontSize: '13px', marginBottom: '10px' } }, manualError),
          React.createElement('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
            React.createElement('button', { type: 'button', onClick: function() { setShowManualForm(false); setManualError(''); },
              style: { padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', fontSize: '13px', cursor: 'pointer' } }, 'Cancel'),
            React.createElement('button', { type: 'submit', disabled: manualSaving,
              style: { padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' } },
              manualSaving ? 'Saving...' : 'Add Test Case')
          )
        )
      ),

      // Manual test cases list
      manualLoading && React.createElement('p', { style: { textAlign: 'center', color: '#6b7280', padding: '20px' } }, 'Loading...'),
      !manualLoading && manualTcs.length === 0 && React.createElement('div', {
        style: { textAlign: 'center', padding: '40px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }
      },
        React.createElement('p', { style: { color: '#6b7280', fontSize: '14px', margin: 0 } }, 'No manual test cases yet. Add one above.')
      ),
      !manualLoading && manualTcs.map(function(tc) {
        var priorityColors = { low: '#6b7280', medium: '#d97706', high: '#ea580c', critical: '#dc2626' };
        return React.createElement('div', { key: tc.id, style: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '8px' } },
          React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' } },
                React.createElement('span', { style: { fontSize: '11px', fontWeight: '700', color: priorityColors[tc.priority] || '#6b7280', textTransform: 'uppercase' } }, tc.priority),
                tc.jiraIssueKey && React.createElement('span', { style: { fontSize: '11px', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '1px 7px', borderRadius: '9999px', fontWeight: '600' } }, '🔗 ' + tc.jiraIssueKey),
                tc.createdByEmail && React.createElement('span', { style: { fontSize: '11px', color: '#9ca3af' } }, 'by ' + tc.createdByEmail)
              ),
              React.createElement('h3', { style: { fontSize: '14px', fontWeight: '600', margin: '0 0 6px' } }, tc.title),
              React.createElement('pre', { style: { fontSize: '12px', color: '#4b5563', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.5' } }, tc.content)
            ),
            React.createElement('button', {
              onClick: function() { handleDeleteManualTc(tc.id); },
              title: 'Delete',
              style: { background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: '16px', padding: '4px 8px', flexShrink: 0 }
            }, '🗑')
          )
        );
      })
    ),

    // ── AI SCENARIOS TAB ───────────────────────────────────────────────────
    // Summary bar (AI tab only)
    activeTab === 'ai' && React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px 20px', border: '1px solid #e5e7eb', marginBottom: '16px' } },
      React.createElement('div', { style: { display: 'flex', gap: '24px' } },
        StatBox('Total', scenarios.length, '#374151'),
        StatBox('Approved', approvedCount, '#16a34a'),
        StatBox('Pending', pendingCount, '#d97706'),
        StatBox('Rejected', rejectedCount, '#dc2626'),
        coverage && StatBox('Quality', coverage.qualityScore + '%', '#7c3aed')
      ),
      React.createElement('div', { style: { display: 'flex', gap: '8px' } },
        React.createElement('button', {
          style: { backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
          onClick: function() { setShowAddModal(true); }
        }, '+ Add Manual Scenario'),
        React.createElement('button', {
          style: { backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: '600', opacity: canExport && !exporting ? 1 : 0.5, cursor: canExport && !exporting ? 'pointer' : 'not-allowed' },
          disabled: !canExport || exporting,
          onClick: handleExport
        }, exporting ? 'Exporting...' : '\u2B07 Export CSV (' + approvedCount + ')'),
        React.createElement(GeneratePlaywrightButton, { projectId: projectId, storyIngestionId: storyId, storyTitle: story.title })
      )
    ),

    // Export message (AI tab)
    activeTab === 'ai' && exportMsg && React.createElement('div', {
      style: { padding: '10px 14px', borderRadius: '6px', fontSize: '13px', border: '1px solid', marginBottom: '16px',
        backgroundColor: exportMsg.indexOf('Error') === 0 ? '#fef2f2' : '#f0fdf4',
        color: exportMsg.indexOf('Error') === 0 ? '#dc2626' : '#16a34a',
        borderColor: exportMsg.indexOf('Error') === 0 ? '#fecaca' : '#bbf7d0' }
    }, exportMsg),

    // Missing categories warning (AI tab)
    activeTab === 'ai' && coverage && coverage.missingCategories.length > 0 && React.createElement('div', {
      style: { backgroundColor: '#fffbeb', color: '#92400e', padding: '10px 14px', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '13px', marginBottom: '16px' }
    }, '\u26A0 Missing coverage: ' + coverage.missingCategories.map(function(c) { return CATEGORY_LABELS[c] || c; }).join(', ')),

    // Add Manual Scenario modal
    showAddModal && React.createElement('div', {
      style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }
    },
      React.createElement('div', { style: { backgroundColor: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' } },
        React.createElement('h2', { style: { fontSize: '18px', fontWeight: '700', marginBottom: '20px' } }, 'Add Manual Scenario'),
        React.createElement('form', { onSubmit: handleAddScenario },
          // Category
          React.createElement('div', { style: { marginBottom: '14px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' } }, 'Category *'),
            React.createElement('select', {
              value: addForm.category, required: true,
              onChange: function(e) { setAddForm(function(f) { return Object.assign({}, f, { category: e.target.value }); }); },
              style: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }
            }, VALID_CATEGORIES.map(function(c) {
              return React.createElement('option', { key: c, value: c }, CATEGORY_LABELS[c] || c);
            }))
          ),
          // Priority
          React.createElement('div', { style: { marginBottom: '14px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' } }, 'Priority *'),
            React.createElement('div', { style: { display: 'flex', gap: '8px' } },
              VALID_PRIORITIES.map(function(p) {
                var pColors = { P0: { bg: '#fee2e2', color: '#991b1b' }, P1: { bg: '#fef3c7', color: '#92400e' }, P2: { bg: '#dbeafe', color: '#1e40af' }, P3: { bg: '#f3f4f6', color: '#374151' } };
                var active = addForm.priority === p;
                var pc = pColors[p];
                return React.createElement('button', {
                  key: p, type: 'button',
                  onClick: function() { setAddForm(function(f) { return Object.assign({}, f, { priority: p }); }); },
                  style: { padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', border: active ? '2px solid ' + pc.color : '2px solid #e5e7eb', backgroundColor: active ? pc.bg : '#fff', color: active ? pc.color : '#6b7280', cursor: 'pointer' }
                }, p);
              })
            )
          ),
          // Title
          React.createElement('div', { style: { marginBottom: '14px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' } }, 'Title *'),
            React.createElement('input', {
              value: addForm.title, required: true, minLength: 5, maxLength: 120,
              placeholder: 'E.g. Login with valid credentials succeeds',
              onChange: function(e) { setAddForm(function(f) { return Object.assign({}, f, { title: e.target.value }); }); },
              style: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }
            })
          ),
          // Summary
          React.createElement('div', { style: { marginBottom: '14px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' } }, 'Summary'),
            React.createElement('textarea', {
              value: addForm.summary, rows: 2, maxLength: 300,
              placeholder: 'Brief description of what this scenario tests and why it matters',
              onChange: function(e) { setAddForm(function(f) { return Object.assign({}, f, { summary: e.target.value }); }); },
              style: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }
            })
          ),
          // Preconditions
          React.createElement('div', { style: { marginBottom: '14px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' } }, 'Preconditions (one per line)'),
            React.createElement('textarea', {
              value: addForm.preconditions, rows: 3,
              placeholder: 'User is authenticated\nTest record exists in DB',
              onChange: function(e) { setAddForm(function(f) { return Object.assign({}, f, { preconditions: e.target.value }); }); },
              style: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }
            })
          ),
          // Test Intent
          React.createElement('div', { style: { marginBottom: '14px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' } }, 'Test Intent'),
            React.createElement('input', {
              value: addForm.test_intent, maxLength: 200,
              placeholder: 'Business risk or compliance requirement being validated',
              onChange: function(e) { setAddForm(function(f) { return Object.assign({}, f, { test_intent: e.target.value }); }); },
              style: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }
            })
          ),
          // Expected Outcome
          React.createElement('div', { style: { marginBottom: '20px' } },
            React.createElement('label', { style: { display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' } }, 'Expected Outcome *'),
            React.createElement('textarea', {
              value: addForm.expected_outcome, required: true, rows: 3, minLength: 5, maxLength: 300,
              placeholder: 'Specific, verifiable result — e.g. "Dashboard shows success banner. Record saved in DB."',
              onChange: function(e) { setAddForm(function(f) { return Object.assign({}, f, { expected_outcome: e.target.value }); }); },
              style: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }
            })
          ),
          addError && React.createElement('div', { style: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px' } }, addError),
          React.createElement('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end' } },
            React.createElement('button', {
              type: 'button',
              onClick: function() { setShowAddModal(false); setAddError(''); },
              style: { padding: '9px 18px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '14px', cursor: 'pointer' }
            }, 'Cancel'),
            React.createElement('button', {
              type: 'submit', disabled: addSaving,
              style: { padding: '9px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: addSaving ? 'not-allowed' : 'pointer', opacity: addSaving ? 0.7 : 1 }
            }, addSaving ? 'Saving...' : 'Add Scenario')
          )
        )
      )
    ),

    // Scenario groups (AI tab)
    activeTab === 'ai' && Object.entries(grouped).map(function(entry) {
      var category = entry[0], items = entry[1];
      return React.createElement('div', { key: category, style: { marginBottom: '24px' } },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px' } },
          React.createElement('h2', { style: { fontSize: '16px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' } },
            CATEGORY_LABELS[category] || category,
            React.createElement('span', { style: { backgroundColor: '#e5e7eb', color: '#374151', fontSize: '12px', padding: '1px 8px', borderRadius: '9999px', fontWeight: '500' } }, items.length)
          ),
          React.createElement('div', { style: { display: 'flex', gap: '8px' } },
            React.createElement('button', { style: { background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: '#16a34a' }, onClick: function() { handleBulkAction(category, 'approved'); } }, '\u2713 Approve All'),
            React.createElement('button', { style: { background: 'none', border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: '#dc2626' }, onClick: function() { handleBulkAction(category, 'rejected'); } }, '\u2715 Reject All')
          )
        ),
        items.map(function(scenario) { return ScenarioCard(scenario, handleStatusChange); })
      );
    }),

    activeTab === 'ai' && scenarios.length === 0 && React.createElement('div', { style: { textAlign: 'center', padding: '40px', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '8px' } }, 'No scenarios generated for this story.')
  );
}

function StatBox(label, value, color) {
  return React.createElement('div', { style: { textAlign: 'center' } },
    React.createElement('div', { style: { fontSize: '20px', fontWeight: '700', color: color } }, value),
    React.createElement('div', { style: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' } }, label)
  );
}

function ScenarioCard(scenario, onStatusChange) {
  var s = scenario;
  var statusConfig = {
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    approved: { bg: '#dcfce7', color: '#166534', label: 'Approved' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  };
  var cfg = statusConfig[s.status] || statusConfig.pending;
  var priorityColors = { P0: '#dc2626', P1: '#d97706', P2: '#2563eb', P3: '#6b7280' };

  var preconditions = [];
  if (Array.isArray(s.preconditions)) { preconditions = s.preconditions; }
  else if (typeof s.preconditions === 'string') {
    try { preconditions = JSON.parse(s.preconditions); } catch(e) { preconditions = [s.preconditions]; }
  }

  var btnBase = { width: '28px', height: '28px', borderRadius: '4px', fontSize: '14px', cursor: 'pointer' };

  return React.createElement('div', { key: s.id, style: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '8px' } },
    React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
      React.createElement('div', { style: { flex: 1 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
          React.createElement('span', { style: { fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', fontWeight: '600', backgroundColor: cfg.bg, color: cfg.color } }, cfg.label),
          React.createElement('span', { style: { fontSize: '11px', fontWeight: '700', color: priorityColors[s.priority] || '#6b7280' } }, s.priority)
        ),
        React.createElement('h3', { style: { fontSize: '14px', fontWeight: '600', margin: '0 0 2px' } }, s.title),
        s.summary && React.createElement('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: '1.4' } }, s.summary)
      ),
      React.createElement('div', { style: { display: 'flex', gap: '4px', flexShrink: 0 } },
        s.status !== 'approved' && React.createElement('button', {
          style: Object.assign({}, btnBase, { border: '1px solid #bbf7d0', backgroundColor: '#dcfce7', color: '#16a34a' }),
          onClick: function() { onStatusChange(s.id, 'approved'); }, title: 'Approve'
        }, '\u2713'),
        s.status !== 'rejected' && React.createElement('button', {
          style: Object.assign({}, btnBase, { border: '1px solid #fecaca', backgroundColor: '#fee2e2', color: '#dc2626' }),
          onClick: function() { onStatusChange(s.id, 'rejected'); }, title: 'Reject'
        }, '\u2715'),
        s.status !== 'pending' && React.createElement('button', {
          style: Object.assign({}, btnBase, { border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', color: '#6b7280' }),
          onClick: function() { onStatusChange(s.id, 'pending'); }, title: 'Reset to Pending'
        }, '\u21BA')
      )
    ),
    React.createElement('div', { style: { marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#374151' } },
      s.test_intent && React.createElement('div', { style: { marginBottom: '6px' } }, React.createElement('strong', null, 'Test Intent: '), s.test_intent),
      preconditions.length > 0 && React.createElement('div', { style: { marginBottom: '6px' } },
        React.createElement('strong', null, 'Preconditions: '),
        preconditions.join(' | ')
      ),
      s.expected_outcome && React.createElement('div', { style: { marginBottom: '6px' } }, React.createElement('strong', null, 'Expected: '), s.expected_outcome)
    )
  );
}
