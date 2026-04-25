import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  X,
  BarChart3,
  FolderOpen,
  Puzzle,
  Settings,
  Activity,
  ClipboardList,
  Play,
  BookOpen,
  FileText,
  Plus,
  Terminal,
  Zap,
  Users,
  Globe,
} from 'lucide-react';

// Command categories and routes
const COMMANDS = [
  // Dashboard
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'View test overview and metrics',
    icon: BarChart3,
    action: '/dashboard',
    category: 'Navigation',
  },
  // Projects
  {
    id: 'projects',
    label: 'All Projects',
    description: 'View and manage all projects',
    icon: FolderOpen,
    action: '/projects',
    category: 'Projects',
  },
  {
    id: 'create-project',
    label: 'Create New Project',
    description: 'Start a new test project',
    icon: Plus,
    action: null,
    category: 'Projects',
    onSelect: 'showCreateProjectModal',
  },
  // Test execution
  {
    id: 'test-runs',
    label: 'Test Runs',
    description: 'View all test execution history',
    icon: Play,
    action: '/test-runs',
    category: 'Execution',
  },
  {
    id: 'executions',
    label: 'Executions',
    description: 'View detailed execution logs and results',
    icon: Terminal,
    action: '/executions',
    category: 'Execution',
  },
  // Stories / AI generation
  {
    id: 'stories',
    label: 'AI Stories',
    description: 'View AI-generated test scenarios',
    icon: Zap,
    action: '/stories',
    category: 'Content',
  },
  // Test plans
  {
    id: 'test-plans',
    label: 'Test Plans',
    description: 'Organize and manage test plans',
    icon: BookOpen,
    action: '/test-plans',
    category: 'Content',
  },
  // Reports
  {
    id: 'reports',
    label: 'Reports',
    description: 'View test reports and insights',
    icon: FileText,
    action: '/reports',
    category: 'Content',
  },
  // Settings
  {
    id: 'settings',
    label: 'Settings',
    description: 'Manage account settings',
    icon: Settings,
    action: '/settings',
    category: 'Configuration',
  },
  {
    id: 'team',
    label: 'Team',
    description: 'Manage team members and roles',
    icon: Users,
    action: '/settings/team',
    category: 'Configuration',
  },
  {
    id: 'environments',
    label: 'Environments',
    description: 'Manage test environments and variables',
    icon: Globe,
    action: '/settings/environments',
    category: 'Configuration',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connect external tools',
    icon: Puzzle,
    action: '/integrations',
    category: 'Configuration',
  },
];

/**
 * CommandPalette: ⌘K / Ctrl+K search and navigation
 * - Keyboard-driven interface
 * - Fuzzy search across pages and actions
 * - Category-grouped results
 * - Full dark mode support
 */
export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Filter commands based on search query
  const filteredCommands = searchQuery.trim()
    ? COMMANDS.filter((cmd) => {
        const query = searchQuery.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(query) ||
          cmd.description.toLowerCase().includes(query) ||
          cmd.category.toLowerCase().includes(query)
        );
      })
    : [];

  // Group by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  // Flatten grouped commands for selection tracking
  const flatCommands = Object.values(groupedCommands).flat();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K opens palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
        setSearchQuery('');
        setSelectedIndex(0);
      }

      // Only handle keys when palette is open
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatCommands.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            handleSelectCommand(flatCommands[selectedIndex]);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, flatCommands]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleSelectCommand = (cmd) => {
    if (cmd.action) {
      navigate(cmd.action);
      setIsOpen(false);
      setSearchQuery('');
    }
    // Handle special actions like modals in future
    if (cmd.onSelect === 'showCreateProjectModal') {
      // TODO: Dispatch event or call callback
      console.log('TODO: Show create project modal');
    }
  };

  return (
    <>
      {/* Keyboard hint in header */}
      <div className="hidden md:inline-flex items-center gap-1 text-xs text-surface-500">
        <kbd className="px-2 py-1 rounded border border-surface-200 bg-surface-50 font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-950/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-label="Command palette overlay"
        />
      )}

      {/* Palette */}
      {isOpen && (
        <div className="fixed left-1/2 top-1/4 z-50 w-full max-w-2xl -translate-x-1/2 animate-fade-in rounded-lg border border-surface-200 bg-white shadow-soft-lg dark:border-surface-800 dark:bg-surface-900">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-surface-200 px-4 py-3 dark:border-surface-800">
            <Search size={18} className="text-surface-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-base outline-none placeholder:text-surface-400"
            />
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-surface-400 hover:text-surface-600"
              aria-label="Close command palette"
            >
              <X size={18} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto p-2">
            {searchQuery && flatCommands.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-surface-500">No results found</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-2">
                  {/* Category header */}
                  <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-surface-400">
                    {category}
                  </div>

                  {/* Commands in category */}
                  {commands.map((cmd, idx) => {
                    const globalIdx = flatCommands.findIndex((c) => c.id === cmd.id);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = cmd.icon;

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => handleSelectCommand(cmd)}
                        className={`w-full rounded px-2 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-500/20'
                            : 'hover:bg-surface-50 dark:hover:bg-surface-800'
                        }`}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                      >
                        <div className="flex items-start gap-3">
                          <Icon
                            size={16}
                            className={`mt-0.5 flex-shrink-0 ${
                              isSelected
                                ? 'text-brand-600'
                                : 'text-surface-400'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium ${
                                isSelected
                                  ? 'text-brand-700 dark:text-brand-300'
                                  : 'text-surface-900 dark:text-surface-100'
                              }`}
                            >
                              {cmd.label}
                            </div>
                            <div className="text-xs text-surface-500">
                              {cmd.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hints */}
          <div className="border-t border-surface-200 bg-surface-50 px-4 py-2 text-xs text-surface-500 dark:border-surface-800 dark:bg-surface-800/50">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <kbd>↑↓</kbd> to navigate
                </div>
                <div className="flex items-center gap-1">
                  <kbd>⏎</kbd> to select
                </div>
                <div className="flex items-center gap-1">
                  <kbd>Esc</kbd> to close
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
