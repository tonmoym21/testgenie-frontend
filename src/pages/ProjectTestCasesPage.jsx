import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft, Plus, Loader2, Trash2, Pencil, X, Search, Folder, FolderOpen,
  FolderPlus, ChevronRight, ChevronDown, Download, Sparkles, BookOpen,
  Library, FileText, MoreHorizontal, Shield, Upload, PlayCircle, Link as LinkIcon,
} from 'lucide-react';
import CreateTestCaseModal from '../components/CreateTestCaseModal';
import ImportTestCasesModal from '../components/ImportTestCasesModal';
import { setCurrentProjectId } from '../utils/currentProject';

const PRIORITY_STYLES = {
  critical: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
  high:     'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/15',
  medium:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15',
  low:      'bg-surface-100 text-surface-600 ring-1 ring-inset ring-surface-300/40',
};

// Build a tree from a flat array of folders keyed by parent_id.
function buildTree(folders) {
  const byParent = new Map();
  for (const f of folders) {
    const key = f.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(f);
  }
  const walk = (parentId) => {
    const children = byParent.get(parentId) || [];
    return children.map((c) => ({ ...c, children: walk(c.id) }));
  };
  return walk(null);
}

function FolderNode({ node, depth, expanded, toggle, selected, onSelect, countFor, onRename, onDelete, onAddChild }) {
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSelected = selected === node.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm relative ${
          isSelected ? 'bg-brand-50 text-brand-800' : 'hover:bg-surface-100 text-surface-700'
        }`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => onSelect(node.id)}
      >
        <button
          type="button"
          className="w-4 h-4 flex items-center justify-center text-surface-400 shrink-0"
          onClick={(e) => { e.stopPropagation(); toggle(node.id); }}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
        >
          {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3" />}
        </button>
        {isExpanded && hasChildren ? <FolderOpen size={14} className="text-amber-500 shrink-0" /> : <Folder size={14} className="text-amber-500 shrink-0" />}
        <span className="truncate flex-1">{node.name}</span>
        <span className="text-[11px] text-surface-400 tabular-nums">{countFor(node.id)}</span>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 icon-btn shrink-0 w-6 h-6"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            aria-label="Folder options"
          >
            <MoreHorizontal size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-surface-200 rounded-lg shadow-soft-lg z-20 w-40 py-1 text-sm">
              <button className="w-full text-left px-3 py-1.5 hover:bg-surface-50" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onAddChild(node.id); }}>Add sub-folder</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-surface-50" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(node); }}>Rename</button>
              <button className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(node); }}>Delete</button>
            </div>
          )}
        </div>
      </div>
      {isExpanded && node.children.map((c) => (
        <FolderNode key={c.id} node={c} depth={depth + 1} expanded={expanded} toggle={toggle}
          selected={selected} onSelect={onSelect} countFor={countFor}
          onRename={onRename} onDelete={onDelete} onAddChild={onAddChild} />
      ))}
    </div>
  );
}

export default function ProjectTestCasesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [folders, setFolders] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selection in tree: 'all' | 'none' | <folderId>
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [expanded, setExpanded] = useState(() => new Set());
  const [query, setQuery] = useState('');

  // Folder modals
  const [folderModal, setFolderModal] = useState(null); // { mode: 'create'|'rename', parentId?, folder? }
  const [folderName, setFolderName] = useState('');
  const [folderSaving, setFolderSaving] = useState(false);

  // Create / Edit TC modal (unified)
  const [showCreate, setShowCreate] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  // Team members for assignee rendering
  const [members, setMembers] = useState([]);
  // Copy/Move target-project picker
  const [projectPicker, setProjectPicker] = useState(null); // { mode: 'copy' | 'move' }
  const [projectsList, setProjectsList] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  // Import TC modal
  const [showImport, setShowImport] = useState(false);
  // Selection + bulk "Add to Run"
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showAddToRun, setShowAddToRun] = useState(false);
  const [testRuns, setTestRuns] = useState([]);
  const [addToRunBusy, setAddToRunBusy] = useState(false);
  // Jira quick-link on edit modal
  const [jiraKey, setJiraKey] = useState('');

  // Edit TC modal
  const [editingTc, setEditingTc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  // Create dropdown
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target)) setCreateMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => { if (projectId) setCurrentProjectId(projectId); }, [projectId]);

  const loadData = useCallback(async () => {
    try {
      const [proj, fs, tcs] = await Promise.all([
        api.getProject(projectId),
        api.getFolders(projectId).catch(() => ({ data: [] })),
        api.getTestCases(projectId, { limit: 200 }),
      ]);
      setProject(proj);
      setFolders(fs.data || []);
      setTestCases(tcs.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load team members once
  useEffect(() => {
    api.listAssignableMembers().then((r) => setMembers(r?.members || [])).catch(() => {});
  }, []);

  // Open edit modal when ?edit=<id> is in the URL
  useEffect(() => {
    const id = searchParams.get('edit');
    if (!id || testCases.length === 0) return;
    const tc = testCases.find((x) => String(x.id) === String(id));
    if (tc) setEditingCase(tc);
  }, [searchParams, testCases]);

  const closeEditFromUrl = () => {
    if (searchParams.get('edit')) {
      const n = new URLSearchParams(searchParams);
      n.delete('edit');
      setSearchParams(n, { replace: true });
    }
  };

  const tree = useMemo(() => buildTree(folders), [folders]);

  const countFor = useMemo(() => {
    const fn = (folderId) => {
      const children = folders.filter((f) => f.parentId === folderId).map((f) => f.id);
      let own = testCases.filter((tc) => tc.folderId === folderId).length;
      for (const c of children) own += fn(c);
      return own;
    };
    return fn;
  }, [folders, testCases]);

  const visibleTestCases = useMemo(() => {
    let list = testCases;
    if (selectedFolder === 'none') list = list.filter((tc) => tc.folderId == null);
    else if (selectedFolder !== 'all') {
      // include descendants of the selected folder
      const ids = new Set([Number(selectedFolder)]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const f of folders) {
          if (f.parentId != null && ids.has(f.parentId) && !ids.has(f.id)) {
            ids.add(f.id); grew = true;
          }
        }
      }
      list = list.filter((tc) => tc.folderId != null && ids.has(tc.folderId));
    }
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((tc) => (tc.title + ' ' + tc.content).toLowerCase().includes(q));
    return list;
  }, [testCases, folders, selectedFolder, query]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleAddRootFolder = () => { setFolderModal({ mode: 'create', parentId: null }); setFolderName(''); };
  const handleAddChildFolder = (parentId) => {
    setFolderModal({ mode: 'create', parentId });
    setFolderName('');
    setExpanded((prev) => new Set(prev).add(parentId));
  };
  const handleRenameFolder = (folder) => { setFolderModal({ mode: 'rename', folder }); setFolderName(folder.name); };
  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Delete folder "${folder.name}"? Test cases inside will be un-foldered.`)) return;
    try {
      await api.deleteFolder(projectId, folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id && f.parentId !== folder.id));
      setTestCases((prev) => prev.map((tc) => tc.folderId === folder.id ? { ...tc, folderId: null } : tc));
      if (selectedFolder === folder.id) setSelectedFolder('all');
    } catch (err) { setError(err.message); }
  };

  const submitFolderModal = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setFolderSaving(true);
    try {
      if (folderModal.mode === 'create') {
        const f = await api.createFolder(projectId, { name: folderName.trim(), parentId: folderModal.parentId });
        setFolders((prev) => [...prev, f]);
        setSelectedFolder(f.id);
      } else {
        const f = await api.updateFolder(projectId, folderModal.folder.id, { name: folderName.trim() });
        setFolders((prev) => prev.map((x) => (x.id === f.id ? f : x)));
      }
      setFolderModal(null);
    } catch (err) { setError(err.message); }
    finally { setFolderSaving(false); }
  };

  const handleImportBatch = async (batch) => {
    const folderId = typeof selectedFolder === 'number' ? selectedFolder : null;
    if (folderId) {
      // Batch endpoint doesn't accept folderId — fall back to per-item create.
      const created = [];
      for (const tc of batch) {
        const row = await api.createTestCase(projectId, {
          title: tc.title, content: tc.content, priority: tc.priority, folderId,
        });
        created.push(row);
      }
      setTestCases((prev) => [...created, ...prev]);
      return;
    }
    const payload = batch.map((tc) => ({
      title: tc.title, content: tc.content, priority: tc.priority,
    }));
    const res = await api.batchCreateTestCases(projectId, payload);
    const created = res?.data || res?.testCases || res || [];
    if (Array.isArray(created) && created.length) {
      setTestCases((prev) => [...created, ...prev]);
    } else {
      try {
        const tcs = await api.getTestCases(projectId, { limit: 200 });
        setTestCases(tcs.data || []);
      } catch {}
    }
  };

  const handleCreateTestCase = async (payload, { keepOpen } = {}) => {
    const folderId = typeof selectedFolder === 'number' ? selectedFolder : null;
    const tc = await api.createTestCase(projectId, {
      title: payload.title,
      content: payload.content,
      priority: payload.priority,
      folderId: folderId || undefined,
      assigneeUserId: payload.assigneeUserId || undefined,
    });
    setTestCases((prev) => [tc, ...prev]);
    if (!keepOpen) setShowCreate(false);
  };

  const openEdit = (tc) => {
    setEditingCase(tc);
  };

  // Submit handler used by the shared CreateTestCaseModal in edit mode.
  const handleEditModalSubmit = async (payload) => {
    const updated = await api.updateTestCase(projectId, editingCase.id, {
      title: payload.title,
      content: payload.content,
      priority: payload.priority,
      assigneeUserId: payload.assigneeUserId ?? null,
    });
    setTestCases((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setEditingCase(null);
    closeEditFromUrl();
  };

  // Bulk actions on selected cases
  const bulkClone = async () => {
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const created = [];
      for (const id of ids) {
        const src = testCases.find((x) => x.id === id);
        if (!src) continue;
        const row = await api.createTestCase(projectId, {
          title: `${src.title} (Copy)`,
          content: src.content,
          priority: src.priority,
          folderId: src.folderId || undefined,
          assigneeUserId: src.assigneeUserId || undefined,
        });
        created.push(row);
      }
      setTestCases((prev) => [...created, ...prev]);
      clearSelection();
    } catch (err) { setError(err.message); }
    finally { setBulkBusy(false); }
  };
  const openProjectPicker = async (mode) => {
    try {
      const r = await api.getProjects();
      setProjectsList(r?.data || r || []);
      setProjectPicker({ mode });
    } catch (err) { setError(err.message); }
  };
  const doCopyOrMove = async (targetProjectId) => {
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const src = testCases.find((x) => x.id === id);
        if (!src) continue;
        await api.createTestCase(targetProjectId, {
          title: src.title,
          content: src.content,
          priority: src.priority,
        });
      }
      if (projectPicker?.mode === 'move') {
        for (const id of ids) {
          await api.deleteTestCase(projectId, id);
        }
        setTestCases((prev) => prev.filter((x) => !ids.includes(x.id)));
      }
      clearSelection();
      setProjectPicker(null);
    } catch (err) { setError(err.message); }
    finally { setBulkBusy(false); }
  };
  const bulkExport = () => {
    const ids = new Set(selectedIds);
    const payload = testCases.filter((tc) => ids.has(tc.id))
      .map((tc) => ({
        id: tc.id, title: tc.title, content: tc.content,
        priority: tc.priority, folderId: tc.folderId,
        assigneeUserId: tc.assigneeUserId, jiraIssueKey: tc.jiraIssueKey,
      }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testcases-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const bulkEditSingle = () => {
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0];
    const n = new URLSearchParams(searchParams);
    n.set('edit', String(id));
    setSearchParams(n, { replace: true });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleSelectAllVisible = (visibleList) => {
    setSelectedIds((prev) => {
      const ids = visibleList.map((tc) => tc.id);
      const allSelected = ids.every((id) => prev.has(id));
      const n = new Set(prev);
      if (allSelected) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const openAddToRun = async () => {
    try {
      const res = await api.listTestRuns(projectId);
      setTestRuns(res.data || []);
      setShowAddToRun(true);
    } catch (err) { setError(err.message); }
  };
  const doAddToRun = async (runId) => {
    setAddToRunBusy(true);
    try {
      await api.addTestRunCases(projectId, runId, Array.from(selectedIds));
      setShowAddToRun(false);
      clearSelection();
      navigate(`/projects/${projectId}/test-runs/${runId}`);
    } catch (err) { setError(err.message); }
    finally { setAddToRunBusy(false); }
  };
  const doCreateRunWithSelection = async () => {
    navigate(`/projects/${projectId}/test-runs/new?caseIds=${Array.from(selectedIds).join(',')}`);
  };

  const handleLinkJira = async () => {
    if (!editingTc) return;
    try {
      if (jiraKey.trim()) {
        await api.linkTestCaseToJira(projectId, editingTc.id, jiraKey.trim(), '');
        setTestCases((prev) => prev.map((x) => x.id === editingTc.id ? { ...x, jiraIssueKey: jiraKey.trim() } : x));
      } else {
        await api.unlinkTestCaseFromJira(projectId, editingTc.id);
        setTestCases((prev) => prev.map((x) => x.id === editingTc.id ? { ...x, jiraIssueKey: null } : x));
      }
    } catch (err) { setError(err.message); }
  };

  const handleEditTestCase = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateTestCase(projectId, editingTc.id, {
        title: editTitle, content: editContent, priority: editPriority,
      });
      setTestCases((prev) => prev.map((tc) => (tc.id === editingTc.id ? updated : tc)));
      setEditingTc(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  const handleDeleteTestCase = async (id) => {
    if (!confirm('Delete this test case?')) return;
    try {
      await api.deleteTestCase(projectId, id);
      setTestCases((prev) => prev.filter((tc) => tc.id !== id));
    } catch (err) { setError(err.message); }
  };

  const handleMoveTestCase = async (tc, folderId) => {
    try {
      const updated = await api.updateTestCase(projectId, tc.id, { folderId: folderId || null });
      setTestCases((prev) => prev.map((x) => (x.id === tc.id ? updated : x)));
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Page header */}
      <div className="px-6 pt-5 pb-3 border-b border-surface-200/70 bg-white/80">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-800 mb-2 transition-colors">
          <ArrowLeft size={12} /> Back to projects
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-surface-900 truncate">{loading ? 'Loading…' : project?.name || 'Test Cases'}</h1>
            {project?.description && <p className="text-sm text-surface-500 mt-0.5 line-clamp-1">{project.description}</p>}
          </div>
          <div className="flex items-center gap-2" ref={createMenuRef}>
            <button className="btn-secondary btn-sm" onClick={() => navigate(`/projects/${projectId}/stories`)}>
              <BookOpen size={14} /> Stories
            </button>
            <button className="btn-secondary btn-sm" onClick={() => navigate('/collections')}>
              <Library size={14} /> Collections
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setShowImport(true)}>
              <Upload size={14} /> Import
            </button>
            <button className="btn-secondary btn-sm">
              <Download size={14} /> Export
            </button>
            <button className="btn-primary btn-sm" disabled title="Generate with AI — coming soon">
              <Sparkles size={14} /> Generate with AI
            </button>
            <div className="relative inline-flex">
              <button className="btn-primary btn-sm rounded-r-none" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Create Test Case
              </button>
              <button
                className="btn-primary btn-sm rounded-l-none border-l border-white/30 px-2"
                onClick={() => setCreateMenuOpen((v) => !v)}
                aria-label="Create options"
              >
                <ChevronDown size={14} />
              </button>
              {createMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-surface-200 rounded-lg shadow-soft-lg z-30 py-1 text-sm">
                  <button
                    onClick={() => { setCreateMenuOpen(false); setShowCreate(true); }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-50 flex items-start gap-2"
                  >
                    <FileText size={14} className="mt-0.5 text-surface-500" />
                    <span>
                      <span className="block font-medium text-surface-900">From scratch</span>
                      <span className="block text-xs text-surface-500">Write a test case manually.</span>
                    </span>
                  </button>
                  <button
                    onClick={() => { setCreateMenuOpen(false); navigate(`/projects/${projectId}/stories`); }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-50 flex items-start gap-2"
                  >
                    <BookOpen size={14} className="mt-0.5 text-surface-500" />
                    <span>
                      <span className="block font-medium text-surface-900">From a story</span>
                      <span className="block text-xs text-surface-500">Generate scenarios from an existing user story.</span>
                    </span>
                  </button>
                  <button
                    onClick={() => { setCreateMenuOpen(false); navigate('/collections'); }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-50 flex items-start gap-2"
                  >
                    <Library size={14} className="mt-0.5 text-surface-500" />
                    <span>
                      <span className="block font-medium text-surface-900">From API collection</span>
                      <span className="block text-xs text-surface-500">Import a Postman collection and auto-generate cases.</span>
                    </span>
                  </button>
                  <div className="border-t border-surface-200/70 my-1" />
                  <button
                    onClick={() => { setCreateMenuOpen(false); setShowImport(true); }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-50 flex items-start gap-2"
                  >
                    <Upload size={14} className="mt-0.5 text-surface-500" />
                    <span>
                      <span className="block font-medium text-surface-900">Import from BrowserStack / CSV</span>
                      <span className="block text-xs text-surface-500">Upload a CSV or JSON export from BrowserStack, TestRail, Zephyr, or Xray.</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mx-6 mt-3 bg-red-50 text-red-700 text-sm px-4 py-2 rounded-lg border border-red-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={14} /></button>
        </div>
      )}

      {/* Workspace split */}
      <div className="flex-1 flex min-h-0">
        {/* Folder tree */}
        <aside className="w-72 border-r border-surface-200/70 bg-white overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-3 border-b border-surface-200/70 sticky top-0 bg-white z-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-500">Folders</span>
            <button className="icon-btn" title="New folder" onClick={handleAddRootFolder}>
              <FolderPlus size={15} />
            </button>
          </div>
          <div className="py-2">
            <button
              onClick={() => setSelectedFolder('all')}
              className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm ${selectedFolder === 'all' ? 'bg-brand-50 text-brand-800 font-medium' : 'text-surface-700 hover:bg-surface-100'}`}
            >
              <Folder size={14} className="text-surface-400" />
              <span className="flex-1 text-left">All test cases</span>
              <span className="text-[11px] text-surface-400 tabular-nums">{testCases.length}</span>
            </button>
            <button
              onClick={() => setSelectedFolder('none')}
              className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm ${selectedFolder === 'none' ? 'bg-brand-50 text-brand-800 font-medium' : 'text-surface-700 hover:bg-surface-100'}`}
            >
              <Folder size={14} className="text-surface-400" />
              <span className="flex-1 text-left">Unassigned</span>
              <span className="text-[11px] text-surface-400 tabular-nums">{testCases.filter((tc) => tc.folderId == null).length}</span>
            </button>
            <div className="px-1 pt-1">
              {tree.length === 0 ? (
                <p className="text-xs text-surface-400 px-3 py-4 italic">
                  No folders yet. Create folders to organize test cases.
                </p>
              ) : (
                tree.map((node) => (
                  <FolderNode
                    key={node.id}
                    node={node}
                    depth={0}
                    expanded={expanded}
                    toggle={toggle}
                    selected={selectedFolder}
                    onSelect={setSelectedFolder}
                    countFor={countFor}
                    onRename={handleRenameFolder}
                    onDelete={handleDeleteFolder}
                    onAddChild={handleAddChildFolder}
                  />
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Test case list */}
        <section className="flex-1 min-w-0 overflow-y-auto bg-surface-50">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 bg-white border-b border-surface-200/70 px-5 py-3 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by Test Case ID or Title"
                className="input pl-9 py-1.5 text-sm"
              />
            </div>
            <span className="text-sm text-surface-500">{visibleTestCases.length} of {testCases.length}</span>
          </div>

          {selectedIds.size > 0 && (
            <div className="sticky top-[53px] z-10 bg-brand-50 border-b border-brand-200 px-5 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-brand-800">{selectedIds.size} selected</span>
              <button onClick={doCreateRunWithSelection} className="btn-primary btn-sm">
                <PlayCircle size={14}/> Create Run
              </button>
              <button onClick={openAddToRun} className="btn-secondary btn-sm">
                <Plus size={14}/> Add to Run
              </button>
              <button onClick={bulkEditSingle} disabled={selectedIds.size !== 1} className="btn-secondary btn-sm disabled:opacity-50" title={selectedIds.size !== 1 ? 'Select exactly one to edit' : 'Edit'}>
                <Pencil size={14}/> Edit
              </button>
              <button onClick={bulkClone} disabled={bulkBusy} className="btn-secondary btn-sm">
                {bulkBusy ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} Clone
              </button>
              <button onClick={() => openProjectPicker('copy')} className="btn-secondary btn-sm">
                <Upload size={14}/> Copy to…
              </button>
              <button onClick={() => openProjectPicker('move')} className="btn-secondary btn-sm">
                <Upload size={14}/> Move to…
              </button>
              <button onClick={bulkExport} className="btn-secondary btn-sm">
                <Download size={14}/> Export
              </button>
              <button onClick={clearSelection} className="text-sm text-surface-600 hover:text-surface-900 ml-auto">Clear</button>
            </div>
          )}

          {/* Column header */}
          <div className="px-5 py-2 bg-surface-100/60 border-b border-surface-200/70 grid grid-cols-[24px_60px_1fr_120px_140px_120px_80px] gap-3 items-center text-[11px] font-semibold uppercase tracking-wider text-surface-500">
            <input
              type="checkbox"
              checked={visibleTestCases.length > 0 && visibleTestCases.every((tc) => selectedIds.has(tc.id))}
              onChange={() => toggleSelectAllVisible(visibleTestCases)}
              aria-label="Select all visible"
            />
            <div>ID</div>
            <div>Title</div>
            <div>Priority</div>
            <div>Folder</div>
            <div>Assignee</div>
            <div className="text-right">Actions</div>
          </div>

          {loading && (
            <div className="p-5 space-y-2">
              {[1,2,3,4].map((i) => <div key={i} className="skeleton h-9 w-full" />)}
            </div>
          )}

          {!loading && visibleTestCases.length === 0 && (
            <div className="empty mt-12">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4"><Shield size={24} /></div>
              <h3 className="text-lg font-semibold text-surface-800 mb-1">No test cases here</h3>
              <p className="text-surface-500 text-sm mb-6 max-w-xs">
                {selectedFolder === 'all'
                  ? 'Start by creating your first test case or importing from a story or API collection.'
                  : 'This folder is empty. Create a test case or move one in from another folder.'}
              </p>
              <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm"><Plus size={14} /> Create Test Case</button>
            </div>
          )}

          {!loading && visibleTestCases.length > 0 && (
            <div className="divide-y divide-surface-200/70 bg-white">
              {visibleTestCases.map((tc) => {
                const folder = folders.find((f) => f.id === tc.folderId);
                const assignee = members.find((m) => m.id === tc.assigneeUserId);
                return (
                  <div key={tc.id} className={`px-5 py-3 grid grid-cols-[24px_60px_1fr_120px_140px_120px_80px] gap-3 items-center transition-colors ${selectedIds.has(tc.id) ? 'bg-brand-50/60' : 'hover:bg-surface-50'}`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tc.id)}
                      onChange={() => toggleSelect(tc.id)}
                      aria-label={`Select test case ${tc.id}`}
                    />
                    <div className="text-xs font-mono text-surface-500">TC-{tc.id}</div>
                    <div className="min-w-0">
                      <button onClick={() => openEdit(tc)} className="text-left w-full">
                        <div className="text-sm font-medium text-surface-900 truncate flex items-center gap-2">
                          {tc.title}
                          {tc.jiraIssueKey && <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 font-normal">{tc.jiraIssueKey}</span>}
                        </div>
                        <div className="text-xs text-surface-500 truncate">{tc.content}</div>
                      </button>
                    </div>
                    <div>
                      <span className={`badge ${PRIORITY_STYLES[tc.priority]} capitalize`}>{tc.priority}</span>
                    </div>
                    <div>
                      <select
                        value={tc.folderId ?? ''}
                        onChange={(e) => handleMoveTestCase(tc, e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="text-xs border border-surface-200 rounded-md px-2 py-1 bg-white w-full"
                      >
                        <option value="">Unassigned</option>
                        {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                    <div className="min-w-0">
                      {assignee ? (
                        <span className="inline-flex items-center gap-1 text-xs text-surface-700" title={assignee.email}>
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-semibold">
                            {((assignee.displayName || assignee.email || '?').trim().charAt(0) || '?').toUpperCase()}
                          </span>
                          <span className="truncate">{assignee.displayName || assignee.email}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-surface-400 italic">Unassigned</span>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(tc)} className="icon-btn" aria-label="Edit"><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteTestCase(tc.id)} className="icon-btn hover:text-red-500" aria-label="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Import TC modal */}
      {showImport && (
        <ImportTestCasesModal
          folderName={(() => {
            if (typeof selectedFolder !== 'number') return null;
            return folders.find((f) => f.id === selectedFolder)?.name || null;
          })()}
          onClose={() => setShowImport(false)}
          onImport={handleImportBatch}
        />
      )}

      {/* Create TC modal */}
      {showCreate && (
        <CreateTestCaseModal
          folderName={(() => {
            if (typeof selectedFolder !== 'number') return null;
            return folders.find((f) => f.id === selectedFolder)?.name || null;
          })()}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreateTestCase}
        />
      )}

      {/* Edit TC modal — unified with Create via CreateTestCaseModal */}
      {editingCase && (
        <CreateTestCaseModal
          folderName={(() => {
            const fid = editingCase.folderId;
            return (fid ? folders.find((f) => f.id === fid)?.name : null) || null;
          })()}
          editingCase={editingCase}
          projectId={projectId}
          onClose={() => { setEditingCase(null); closeEditFromUrl(); }}
          onSubmit={handleEditModalSubmit}
        />
      )}

      {/* Project picker (Copy to / Move to) */}
      {projectPicker && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setProjectPicker(null)}>
          <div className="bg-white rounded-xl shadow-soft-lg w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200/70">
              <h3 className="font-semibold text-surface-900">
                {projectPicker.mode === 'move' ? 'Move' : 'Copy'} {selectedIds.size} test case{selectedIds.size === 1 ? '' : 's'} to…
              </h3>
              <button onClick={() => setProjectPicker(null)} className="icon-btn"><X size={16}/></button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-surface-200/70">
              {(projectsList || []).filter((p) => String(p.id) !== String(projectId)).map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => doCopyOrMove(p.id)}
                    disabled={bulkBusy}
                    className="w-full text-left px-4 py-3 hover:bg-surface-50 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Folder size={14} className="text-amber-500" />
                    <span className="text-sm text-surface-900">{p.name}</span>
                  </button>
                </li>
              ))}
              {(projectsList || []).filter((p) => String(p.id) !== String(projectId)).length === 0 && (
                <li className="p-6 text-center text-sm text-surface-500">No other projects available.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Legacy inline edit modal — kept for editingTc compatibility (unused) */}
      {editingTc && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditingTc(null)}>
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900">Edit test case</h2>
              <button onClick={() => setEditingTc(null)} className="icon-btn"><X size={16} /></button>
            </div>
            <form onSubmit={handleEditTestCase} className="space-y-4">
              <div>
                <label className="label">Title</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" required />
              </div>
              <div>
                <label className="label">Steps / content</label>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="input font-mono text-sm" rows={6} required />
              </div>
              <div>
                <label className="label">Priority</label>
                <div className="flex gap-2 flex-wrap">
                  {['low','medium','high','critical'].map((p) => (
                    <button key={p} type="button" onClick={() => setEditPriority(p)}
                      className={`badge capitalize cursor-pointer ${editPriority === p ? PRIORITY_STYLES[p] : 'bg-surface-50 text-surface-400 ring-1 ring-inset ring-surface-200'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label flex items-center gap-1"><LinkIcon size={12}/> Jira issue / story key</label>
                <div className="flex gap-2">
                  <input
                    value={jiraKey}
                    onChange={(e) => setJiraKey(e.target.value)}
                    placeholder="e.g. PROJ-1234"
                    className="input flex-1 font-mono text-sm"
                  />
                  <button type="button" onClick={handleLinkJira} className="btn-secondary btn-sm">
                    {jiraKey.trim() ? 'Link' : 'Unlink'}
                  </button>
                </div>
                <p className="text-xs text-surface-500 mt-1">Use a story key (e.g. PROJ-100) to link this test case to a user story, or an issue key for a bug.</p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingTc(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Test Run modal */}
      {showAddToRun && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddToRun(false)}>
          <div className="bg-white rounded-xl shadow-soft-lg w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200/70">
              <h3 className="font-semibold text-surface-900">Add {selectedIds.size} test case{selectedIds.size === 1 ? '' : 's'} to a run</h3>
              <button onClick={() => setShowAddToRun(false)} className="icon-btn"><X size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {testRuns.length === 0 ? (
                <div className="p-6 text-center text-sm text-surface-500">
                  No test runs yet.{' '}
                  <button
                    onClick={() => { setShowAddToRun(false); navigate(`/projects/${projectId}/test-runs/new?caseIds=${Array.from(selectedIds).join(',')}`); }}
                    className="text-brand-600 hover:underline"
                  >Create one</button>.
                </div>
              ) : (
                <ul className="divide-y divide-surface-200/70">
                  {testRuns.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => doAddToRun(r.id)}
                        disabled={addToRunBusy}
                        className="w-full text-left px-4 py-3 hover:bg-surface-50 flex items-center gap-3"
                      >
                        <PlayCircle size={16} className="text-brand-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-surface-900 truncate">{r.name}</div>
                          <div className="text-xs text-surface-500 capitalize">{String(r.state || '').replace('_',' ')} · {(r.testCaseIds || []).length} existing</div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-5 py-3 border-t border-surface-200/70 flex justify-between">
              <button
                onClick={() => { setShowAddToRun(false); navigate(`/projects/${projectId}/test-runs/new?caseIds=${Array.from(selectedIds).join(',')}`); }}
                className="btn-secondary btn-sm"
              ><Plus size={14}/> New run</button>
              <button onClick={() => setShowAddToRun(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Folder modal */}
      {folderModal && (
        <div className="fixed inset-0 bg-surface-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setFolderModal(null)}>
          <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-900">
                {folderModal.mode === 'create' ? (folderModal.parentId ? 'New sub-folder' : 'New folder') : 'Rename folder'}
              </h2>
              <button onClick={() => setFolderModal(null)} className="icon-btn"><X size={16} /></button>
            </div>
            <form onSubmit={submitFolderModal} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input value={folderName} onChange={(e) => setFolderName(e.target.value)} className="input" required autoFocus />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setFolderModal(null)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={folderSaving} className="btn-primary">
                  {folderSaving && <Loader2 size={14} className="animate-spin" />}
                  {folderModal.mode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
