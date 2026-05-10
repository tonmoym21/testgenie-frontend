import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3, FolderOpen, ClipboardList, Play, BookOpen, FileText, Bot,
  Library, Server, Globe, Clock, Activity, Puzzle, Users, Settings as SettingsIcon,
  ScrollText, Sparkles, Search, HelpCircle, Sun, Moon, Command, Zap, ListChecks,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// HOW TO ADD A NEW FEATURE TO THIS PAGE
// -----------------------------------------------------------------------------
// 1. Append an entry to FEATURES below with a unique `id`, `title`, `icon`,
//    short `summary`, optional `route` (so the user can jump straight to it),
//    and a `steps` array describing how to use it.
// 2. Optionally add a `tips` array for callouts.
// 3. The page automatically renders the new section, the sidebar table of
//    contents, and includes it in search.
// -----------------------------------------------------------------------------

const FEATURES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Sparkles,
    category: 'Basics',
    summary:
      'A quick orientation for first-time users — sign in, land on the dashboard, and create your first project.',
    steps: [
      'Sign in from the login page using your email and password. New teammates join via an invite link emailed by an admin.',
      'After logging in you arrive at the Dashboard — a high-level health view of your tests across the workspace.',
      'Open Projects from the left sidebar to create your first project. A project is the top-level container for test cases, runs and automation assets.',
      'Inside a project, jump to Test Cases to author tests, Test Runs to execute them, and Reports to review results.',
    ],
    tips: [
      'Press ⌘K (Mac) or Ctrl+K (Windows/Linux) anywhere to open the command palette and jump to any page.',
      'Press / to focus the global search bar in the header.',
    ],
  },
  {
    id: 'dashboards',
    title: 'Dashboards',
    icon: BarChart3,
    category: 'Overview',
    route: '/dashboard',
    summary:
      'Three dashboards summarise workspace health: combined, API-only, and Automation-only. Each shows trend cards, recent runs, and alerts.',
    steps: [
      'Open the Dashboards entry from the sidebar to view the combined dashboard.',
      'Use the dashboard switcher (or routes /dashboard/api and /dashboard/automation) to focus on API tests or browser automation only.',
      'Trend cards show pass-rate, duration and failure-rate movement over time with sparkline indicators.',
      'The Recent Runs row shows the last 8 executions with status, duration and timestamp — click any run to jump to its detail.',
      'The Alerts banner surfaces flaky tests and failing schedules that need attention.',
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: FolderOpen,
    category: 'Core',
    route: '/projects',
    summary:
      'Projects are the top-level container. Each project owns its own test cases, runs, plans, reports, stories and automation assets.',
    steps: [
      'Go to Projects from the sidebar. Click "New Project" to create one — give it a name and an optional target application URL.',
      'Open a project to expand the sidebar children: Insights, Test Cases, Test Runs, Test Plans, Reports.',
      'The project header lets you configure target app settings, default environment, and default browser.',
      'You can switch between projects at any time — the sidebar always reflects the project you last opened.',
    ],
  },
  {
    id: 'test-cases',
    title: 'Test Cases',
    icon: ClipboardList,
    category: 'Authoring',
    summary:
      'Author API and UI test cases inside a project. Supports manual creation, AI-assisted generation, and CSV import.',
    steps: [
      'Inside a project, open Test Cases from the sidebar.',
      'Click "New Test" (or use the "+ New test" button in the top header) to open the test case modal.',
      'Choose the test type (API or UI), provide a title, preconditions, steps and expected result.',
      'For API tests, set the method, URL, headers, body and assertions. Variables in {{double_braces}} are resolved from the active environment.',
      'Use "Import" to bulk-load test cases from a CSV file, or "Organize" to bulk-edit tags and ownership.',
      'Each test case lists its recent executions so you can see history at a glance.',
    ],
    tips: [
      'Use Stories (AI-generated scenarios) to bulk-create coverage from a user story before refining individual cases.',
    ],
  },
  {
    id: 'test-runs',
    title: 'Test Runs & Executions',
    icon: Play,
    category: 'Execution',
    route: '/test-runs',
    summary:
      'Group test cases into a run and execute them together. The Execution detail view is a debugger-style timeline with logs, network and assertions.',
    steps: [
      'Open Test Runs inside a project and click "New Run".',
      'Select the test cases to include, the environment, and the browser (for UI tests).',
      'Start the run — TestForge queues the executions and streams live status.',
      'Open any run to see its summary; open an execution to enter the debugger view.',
      'In the Execution detail, the left timeline lists each step. Click a step to jump the Logs and Network panels to that point in time.',
      'Tabs: Logs (color-coded by level), Network (HTTP requests), Screenshots (UI tests), Assertions (expected vs actual diff).',
    ],
    tips: [
      'Click "Retry" on a failed execution to re-run only that test with the same inputs.',
      'Export a run to CSV from the run header to share results with stakeholders.',
    ],
  },
  {
    id: 'test-plans',
    title: 'Test Plans',
    icon: BookOpen,
    category: 'Planning',
    summary:
      'Group related test cases into a reusable plan. Plans can be triggered manually or attached to schedules.',
    steps: [
      'Open Test Plans inside a project.',
      'Click "New Plan", name it, and add test cases by tag, by ID, or by selecting from a list.',
      'Save the plan — it becomes available as a target when creating a Test Run or a Schedule.',
    ],
  },
  {
    id: 'stories',
    title: 'Stories (AI Scenario Generation)',
    icon: Sparkles,
    category: 'Authoring',
    summary:
      'Paste or write a user story and let TestForge generate test scenarios using AI, then promote the ones you want into real test cases.',
    steps: [
      'Inside a project, open Stories and click "New Story".',
      'Provide the story text (acceptance criteria, user role, expected behaviour). The clearer the story, the better the generated scenarios.',
      'Click Generate — the AI proposes a list of positive, negative and edge-case scenarios.',
      'Review the scenarios. Edit any that need refinement, then promote selected scenarios to test cases with one click.',
      'Promoted scenarios appear in Test Cases ready to be run.',
    ],
    tips: [
      'Stories also support "Generate Playwright" to scaffold a Playwright spec directly from selected scenarios.',
    ],
  },
  {
    id: 'automation',
    title: 'Automation Assets (Playwright)',
    icon: Bot,
    category: 'Automation',
    summary:
      'Generate, store and run Playwright test scripts. Includes a preflight checklist that verifies selectors and credentials before a run.',
    steps: [
      'Open Automation inside a project. Existing assets show their last-run status and duration.',
      'Click "New Asset" to create one. You can upload a .spec.js file or generate one from selected test cases / stories.',
      'Open an asset to view the script, its selectors, and its target environment.',
      'Use the Preflight Checklist to validate that all selectors resolve and that required env vars and secrets exist before launching.',
      'Click Run to execute. The execution surfaces in the same Execution detail view as API tests.',
      'Bulk Run lets you launch multiple assets in parallel.',
    ],
  },
  {
    id: 'collections',
    title: 'Collections',
    icon: Library,
    category: 'Authoring',
    route: '/collections',
    summary:
      'A Postman-style way to group API requests, share them, and run them as a sequence with chained variables.',
    steps: [
      'Open Collections from the catch-all sidebar entry or via /collections.',
      'Create a collection, then add requests (method, URL, headers, body, assertions).',
      'Use {{variable}} syntax to reference values from the active environment or from a previous response (e.g. {{login.token}}).',
      'Run the entire collection in order — the Response Viewer shows status, body, headers and assertion results for each step.',
    ],
  },
  {
    id: 'environments',
    title: 'Environments',
    icon: Server,
    category: 'Settings',
    route: '/environments',
    summary:
      'Reusable sets of variables (URLs, tokens, IDs) that tests interpolate at run time. Switch the active environment to retarget a run.',
    steps: [
      'Go to Settings → Environments (or /environments).',
      'Click "New Environment" — typical names are Local, Staging, Production.',
      'Add key/value variables. Mark sensitive values as Secret to mask them in logs and the UI.',
      'Set one environment as Active — it is the default for new runs. You can override per-run when launching.',
    ],
    tips: [
      'Secret values are masked in console logs and in the Execution detail Network panel.',
    ],
  },
  {
    id: 'globals',
    title: 'Global Variables',
    icon: Globe,
    category: 'Settings',
    route: '/globals',
    summary:
      'Variables that are available across every environment. Useful for company-wide constants like a base path or feature-flag.',
    steps: [
      'Go to Settings → Globals (or /globals).',
      'Add key/value pairs. Globals are merged under environment variables, so an environment can override a global with the same key.',
    ],
  },
  {
    id: 'schedules',
    title: 'Schedules',
    icon: Clock,
    category: 'Automation',
    route: '/schedules',
    summary:
      'Run a test plan or automation asset on a recurring cron schedule and email a report when it completes.',
    steps: [
      'Open Schedules from the sidebar.',
      'Click "New Schedule" — pick the target (test plan or automation asset), the environment, and a cron expression (e.g. 0 8 * * 1-5 for weekdays at 8am).',
      'Optionally add email recipients to receive the run report.',
      'Save. The schedule shows next-fire time and last-run status. Toggle it off any time without deleting it.',
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: FileText,
    category: 'Insights',
    route: '/reports',
    summary:
      'Per-run reports with pass/fail counts, durations, screenshots, and a downloadable CSV export.',
    steps: [
      'Open Reports from the sidebar (workspace-wide) or from a project (project-scoped).',
      'Filter by date range, status, environment or tag to narrow the list.',
      'Open a report to see the run summary, the per-test breakdown, and any attached screenshots or logs.',
      'Click "Export CSV" to download the report for sharing or further analysis.',
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    icon: Activity,
    category: 'Insights',
    summary:
      'Project-level analytics: failure trends, flakiness leaderboard, coverage by tag, and AI-generated suggestions for fixes or new tests.',
    steps: [
      'Inside a project, open Insights from the sidebar.',
      'Failure Trends shows the rolling failure rate and the top failing tests.',
      'Health Metrics summarises pass-rate, average duration and flakiness.',
      'AI Insights and Automation Suggestions propose follow-ups based on recent runs.',
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations & Jira',
    icon: Puzzle,
    category: 'Integrations',
    route: '/integrations',
    summary:
      'Connect external tools. The Jira integration lets you link tickets to test cases and create issues from failed executions.',
    steps: [
      'Open Integrations from the sidebar to see all available connectors.',
      'For Jira: provide the host, email and API token, then select a default project key.',
      'Once connected, /jira shows the link panel — search Jira issues and attach them to test cases or runs.',
      'From an Execution detail page, the "Create Jira issue" action prefills the ticket with logs and the failing assertion.',
    ],
  },
  {
    id: 'team',
    title: 'Team & Invitations',
    icon: Users,
    category: 'Settings',
    route: '/team',
    summary:
      'Invite teammates, manage roles (Owner, Admin, Member, Viewer), and review pending invitations. Admin-only.',
    steps: [
      'Go to Settings → Team (admin only).',
      'Click "Invite" — enter the email address and pick a role. The invite link is emailed and is valid for 7 days.',
      'Pending invites are listed with a "Resend" and "Revoke" action.',
      'Existing members can be promoted, demoted or removed from the member row menu.',
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: SettingsIcon,
    category: 'Settings',
    route: '/settings',
    summary:
      'A single page that tabs across Team, Environments and Globals.',
    steps: [
      'Open Settings from the sidebar.',
      'Switch tabs to manage the corresponding area. Tabs respect your role — non-admins do not see Team.',
    ],
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    icon: ScrollText,
    category: 'Settings',
    route: '/audit-logs',
    summary:
      'Tamper-evident record of who did what and when across the workspace. Admin-only.',
    steps: [
      'Open Audit logs from the sidebar (admin only).',
      'Filter by actor, action type (login, run started, role changed, etc.) and date range.',
      'Each row shows actor, IP, action, target entity and timestamp.',
    ],
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    icon: Command,
    category: 'Productivity',
    summary:
      'A keyboard-first navigator. Open it with ⌘K / Ctrl+K from anywhere to jump to any page or run a quick action.',
    steps: [
      'Press ⌘K (Mac) or Ctrl+K (Windows/Linux).',
      'Start typing — results are grouped by category (Pages, Quick actions).',
      'Use ↑ / ↓ to navigate, Enter to select, Esc to close.',
    ],
  },
  {
    id: 'search-theme',
    title: 'Search & Theme',
    icon: Search,
    category: 'Productivity',
    summary:
      'Global search and dark/light theme toggle live in the top header on every page.',
    steps: [
      'The search bar (top-left of the header) searches across projects, test cases and executions. Press / from anywhere to focus it.',
      'The Sun/Moon icon toggles between light and dark themes. Your choice is remembered on this device.',
    ],
  },
  {
    id: 'preflight',
    title: 'Preflight Checklist',
    icon: ListChecks,
    category: 'Automation',
    summary:
      'Before a run, Preflight verifies that selectors resolve, required env vars exist, and secrets are reachable. Catches the boring failures up front.',
    steps: [
      'Open an automation asset and click "Preflight" (also available before bulk runs).',
      'Each check shows pass/warn/fail with a one-line reason. Resolve fails before triggering the run.',
    ],
  },
];

const CATEGORY_ORDER = [
  'Basics', 'Overview', 'Core', 'Authoring', 'Execution', 'Planning',
  'Automation', 'Settings', 'Insights', 'Integrations', 'Productivity',
];

export default function HelpPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FEATURES;
    return FEATURES.filter((f) => {
      const hay = [
        f.title, f.summary, f.category,
        ...(f.steps || []),
        ...(f.tips || []),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const f of filtered) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category).push(f);
    }
    return CATEGORY_ORDER
      .filter((c) => map.has(c))
      .map((c) => [c, map.get(c)]);
  }, [filtered]);

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-500/10 dark:bg-lime-500/10 text-brand-600 dark:text-lime-400 flex items-center justify-center">
          <HelpCircle size={20} />
        </div>
        <div className="flex-1">
          <h1 className="page-title mb-1">Help & Documentation</h1>
          <p className="page-subtitle">
            A step-by-step guide to every feature in TestForge. Use the search below or jump to a section from the sidebar.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-xl">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search features (e.g. schedule, jira, environment)…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-100/70 border border-transparent placeholder:text-surface-400
                     hover:bg-surface-100 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none
                     transition-colors
                     dark:bg-surface-900/70 dark:text-surface-100 dark:placeholder:text-surface-500
                     dark:hover:bg-surface-900 dark:focus:bg-surface-900 dark:focus:border-lime-500 dark:focus:ring-lime-500/15"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* TOC */}
        <aside className="lg:sticky lg:top-20 lg:self-start hidden lg:block">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-surface-500 mb-2 px-2">
            On this page
          </div>
          <nav className="space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <div className="px-2 text-[11px] font-semibold uppercase tracking-wide text-surface-400 mb-1">
                  {category}
                </div>
                <ul className="space-y-0.5">
                  {items.map((f) => (
                    <li key={f.id}>
                      <a
                        href={`#${f.id}`}
                        className="block px-2 py-1 text-sm text-surface-600 dark:text-surface-300 rounded hover:bg-surface-100 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-white transition-colors"
                      >
                        {f.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {grouped.length === 0 && (
              <div className="px-2 text-xs text-surface-400">No matches.</div>
            )}
          </nav>
        </aside>

        {/* Content */}
        <div className="space-y-8 min-w-0">
          {grouped.length === 0 && (
            <div className="card p-6 text-center text-surface-500">
              No features match "{query}".
            </div>
          )}

          {grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-500 mb-3">
                {category}
              </h2>
              <div className="space-y-4">
                {items.map((f) => {
                  const Icon = f.icon || Zap;
                  return (
                    <article
                      key={f.id}
                      id={f.id}
                      className="card p-5 scroll-mt-20"
                    >
                      <header className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 flex items-center justify-center shrink-0">
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-50">
                              {f.title}
                            </h3>
                            {f.route && (
                              <Link
                                to={f.route}
                                className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 hover:bg-brand-500/20 dark:bg-lime-500/10 dark:text-lime-300 dark:hover:bg-lime-500/20 transition-colors"
                              >
                                Open →
                              </Link>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                            {f.summary}
                          </p>
                        </div>
                      </header>

                      {f.steps && f.steps.length > 0 && (
                        <ol className="mt-3 space-y-2 pl-2">
                          {f.steps.map((step, i) => (
                            <li key={i} className="flex gap-3 text-sm text-surface-700 dark:text-surface-200">
                              <span className="shrink-0 w-6 h-6 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-xs font-semibold flex items-center justify-center">
                                {i + 1}
                              </span>
                              <span className="pt-0.5">{step}</span>
                            </li>
                          ))}
                        </ol>
                      )}

                      {f.tips && f.tips.length > 0 && (
                        <div className="mt-4 rounded-lg border border-brand-200/60 bg-brand-50/40 dark:border-lime-500/20 dark:bg-lime-500/5 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-700 dark:text-lime-400 mb-1">
                            Tips
                          </div>
                          <ul className="space-y-1">
                            {f.tips.map((tip, i) => (
                              <li key={i} className="text-sm text-surface-700 dark:text-surface-200">
                                • {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {/* Footer */}
          <div className="text-xs text-surface-400 text-center pt-4 pb-2">
            Missing something? This page is generated from a single list of features —
            ask the team to add new sections to <code className="font-mono">src/pages/HelpPage.jsx</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
