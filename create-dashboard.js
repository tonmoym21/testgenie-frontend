const fs = require('fs');
const path = require('path');

const files = {
  'src/data/mockDashboard.js': `export const mockAlerts = [
  { id: 1, type: 'critical', message: 'Login flow test failed 3 consecutive times', test: 'Login Flow - Valid Credentials', time: '12 min ago' },
  { id: 2, type: 'warning', message: 'API response time exceeded 3s threshold', test: 'Checkout API - Create Order', time: '45 min ago' },
];

export const mockInsights = [
  { id: 1, type: 'coverage', title: 'Missing error boundary tests', description: 'Payment module has 0 negative test cases. Add tests for declined cards, timeout, and network errors.', priority: 'high', action: 'Generate Tests' },
  { id: 2, type: 'flaky', title: 'Flaky test detected', description: 'Search Results Load has passed 6/10 runs this week. Likely a timing issue with async data fetch.', priority: 'medium', action: 'View Details' },
  { id: 3, type: 'optimization', title: 'Duplicate test steps found', description: '4 tests share identical login sequences. Extract to a shared fixture to save ~45s per run.', priority: 'low', action: 'Optimize' },
  { id: 4, type: 'risk', title: 'Untested critical path', description: 'Password reset flow has no automated tests. This is a high-traffic user journey.', priority: 'high', action: 'Create Test' },
];

export const mockFailureTrend = [
  { day: 'Mon', passed: 24, failed: 3, total: 27 },
  { day: 'Tue', passed: 28, failed: 1, total: 29 },
  { day: 'Wed', passed: 22, failed: 5, total: 27 },
  { day: 'Thu', passed: 30, failed: 2, total: 32 },
  { day: 'Fri', passed: 26, failed: 4, total: 30 },
  { day: 'Sat', passed: 18, failed: 0, total: 18 },
  { day: 'Sun', passed: 12, failed: 1, total: 13 },
];

export const mockHealthMetrics = {
  passRate: 87, passRateDelta: 4.2,
  totalRuns: 186, totalRunsDelta: 12,
  avgDuration: 2340, avgDurationDelta: -180,
  flakyTests: 3, flakyTestsDelta: -1,
};

export const mockSuggestions = [
  { id: 1, type: 'generate', title: 'Auto-generate API tests for /api/orders', description: 'Based on your OpenAPI spec, we can generate 8 test cases covering CRUD operations.', effort: 'Low', impact: 'High' },
  { id: 2, type: 'refactor', title: 'Consolidate login test fixtures', description: 'Merge 4 duplicate login sequences into a shared beforeEach hook.', effort: 'Low', impact: 'Medium' },
  { id: 3, type: 'expand', title: 'Add mobile viewport tests', description: 'Your UI tests only run at 1280px. Add 375px and 768px breakpoints for 3 critical flows.', effort: 'Medium', impact: 'High' },
];

export const mockTeamActivity = [
  { id: 1, user: 'Tonmoy M.', action: 'ran', target: 'Checkout Flow - Full Suite', result: 'passed', time: '5 min ago', avatar: 'TM' },
  { id: 2, user: 'Tonmoy M.', action: 'created', target: 'API Test - User Registration', result: null, time: '1 hr ago', avatar: 'TM' },
  { id: 3, user: 'Tonmoy M.', action: 'ran', target: 'Login Flow - Invalid Password', result: 'failed', time: '2 hr ago', avatar: 'TM' },
  { id: 4, user: 'Tonmoy M.', action: 'analyzed', target: 'E-commerce Checkout Suite', result: 'coverage_gaps', time: '3 hr ago', avatar: 'TM' },
  { id: 5, user: 'Tonmoy M.', action: 'fixed', target: 'Search Results - Flaky Selector', result: 'passed', time: '5 hr ago', avatar: 'TM' },
];`,

  'src/components/dashboard/AlertsBanner.jsx': `import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function AlertsBanner({ alerts = [] }) {
  const [dismissed, setDismissed] = useState([]);
  const visible = alerts.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {visible.map((alert) => (
        <div key={alert.id} className={\`flex items-start gap-3 px-4 py-3 rounded-lg text-sm \${alert.type === 'critical' ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}\`}>
          <AlertTriangle size={16} className={\`mt-0.5 shrink-0 \${alert.type === 'critical' ? 'text-red-500' : 'text-amber-500'}\`} />
          <div className="flex-1 min-w-0">
            <span className="font-medium">{alert.message}</span>
            <span className="text-xs opacity-60 ml-2">{alert.time}</span>
            {alert.test && <div className="mt-1 text-xs opacity-70 font-mono">{alert.test}</div>}
          </div>
          <button onClick={() => setDismissed((p) => [...p, alert.id])} className="p-0.5 opacity-40 hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}`,

  'src/components/dashboard/HealthMetrics.jsx': `import { TrendingUp, TrendingDown, Activity, Clock, Zap, AlertTriangle } from 'lucide-react';

const METRICS = [
  { key: 'passRate', label: 'Pass Rate', icon: Activity, fmt: (v) => v + '%', dk: 'passRateDelta', df: (v) => (v > 0 ? '+' : '') + v + '%', color: (v) => v >= 80 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50' },
  { key: 'totalRuns', label: 'Total Runs', icon: Zap, fmt: (v) => v, dk: 'totalRunsDelta', df: (v) => (v > 0 ? '+' : '') + v + ' today', color: () => 'text-brand-600 bg-brand-50' },
  { key: 'avgDuration', label: 'Avg Duration', icon: Clock, fmt: (v) => v >= 1000 ? (v/1000).toFixed(1) + 's' : v + 'ms', dk: 'avgDurationDelta', df: (v) => (v > 0 ? '+' : '') + v + 'ms', color: () => 'text-purple-600 bg-purple-50', inv: true },
  { key: 'flakyTests', label: 'Flaky Tests', icon: AlertTriangle, fmt: (v) => v, dk: 'flakyTestsDelta', df: (v) => (v > 0 ? '+' : '') + v, color: (v) => v === 0 ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50', inv: true },
];

export default function HealthMetrics({ metrics = {} }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {METRICS.map(({ key, label, icon: Icon, fmt, dk, df, color, inv }) => {
        const val = metrics[key]; const delta = metrics[dk]; const pos = inv ? delta < 0 : delta > 0;
        return (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={\`w-9 h-9 rounded-lg flex items-center justify-center \${color(val)}\`}><Icon size={18} /></div>
              {delta !== undefined && delta !== 0 && (
                <div className={\`flex items-center gap-0.5 text-xs font-medium \${pos ? 'text-green-600' : 'text-red-500'}\`}>
                  {pos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{df(delta)}
                </div>
              )}
            </div>
            <div className="text-2xl font-semibold tracking-tight">{fmt(val)}</div>
            <div className="text-xs text-gray-400 mt-0.5">{label}</div>
          </div>
        );
      })}
    </div>
  );
}`,

  'src/components/dashboard/FailureTrends.jsx': `import { useState } from 'react';

export default function FailureTrends({ data = [] }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-sm">Failure Trends</h3>
          <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> Passed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Failed</span>
        </div>
      </div>
      <div className="flex items-end gap-3 h-40">
        {data.map((day, i) => (
          <div key={day.day} className="flex-1 flex flex-col items-center gap-1 relative" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {hovered === i && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-lg">
                <div className="font-medium mb-1">{day.day}</div>
                <div className="flex gap-3"><span className="text-green-300">{day.passed} passed</span><span className="text-red-300">{day.failed} failed</span></div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
              </div>
            )}
            <div className="w-full flex flex-col justify-end h-32 gap-0.5">
              <div className="w-full bg-red-400 rounded-t transition-all duration-300" style={{ height: (day.failed / max * 100) + '%', minHeight: day.failed > 0 ? '4px' : '0' }} />
              <div className="w-full bg-green-400 rounded-b transition-all duration-300" style={{ height: (day.passed / max * 100) + '%', minHeight: '4px' }} />
            </div>
            <span className={\`text-xs \${hovered === i ? 'text-gray-900 font-medium' : 'text-gray-400'}\`}>{day.day}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <span>Total: {data.reduce((s, d) => s + d.total, 0)} runs</span>
        <span>Failures: {data.reduce((s, d) => s + d.failed, 0)}</span>
        <span>Rate: {Math.round(data.reduce((s, d) => s + d.passed, 0) / Math.max(data.reduce((s, d) => s + d.total, 0), 1) * 100)}%</span>
      </div>
    </div>
  );
}`,

  'src/components/dashboard/AiInsights.jsx': `import { Lightbulb, Shield, RefreshCw, Target, ChevronRight } from 'lucide-react';

const ICONS = { coverage: { icon: Target, color: 'text-blue-500 bg-blue-50' }, flaky: { icon: RefreshCw, color: 'text-amber-500 bg-amber-50' }, optimization: { icon: Lightbulb, color: 'text-purple-500 bg-purple-50' }, risk: { icon: Shield, color: 'text-red-500 bg-red-50' } };
const PRI = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-600' };

export default function AiInsights({ insights = [] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center"><Lightbulb size={14} className="text-white" /></div>
        <div><h3 className="font-semibold text-sm">AI Insights</h3><p className="text-xs text-gray-400">{insights.length} recommendations</p></div>
      </div>
      <div className="space-y-3">
        {insights.map((item) => {
          const { icon: Icon, color } = ICONS[item.type] || ICONS.coverage;
          return (
            <div key={item.id} className="group p-3 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50/20 transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <div className={\`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 \${color}\`}><Icon size={15} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-medium \${PRI[item.priority]}\`}>{item.priority}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                  <button className="mt-2 text-xs text-brand-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">{item.action} <ChevronRight size={12} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}`,

  'src/components/dashboard/AutomationSuggestions.jsx': `import { Wand2, ArrowRight } from 'lucide-react';

const EFF = { Low: 'bg-green-100 text-green-700', Medium: 'bg-amber-100 text-amber-700', High: 'bg-red-100 text-red-700' };
const IMP = { High: 'bg-blue-100 text-blue-700', Medium: 'bg-gray-100 text-gray-600', Low: 'bg-gray-50 text-gray-500' };

export default function AutomationSuggestions({ suggestions = [] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center"><Wand2 size={14} className="text-white" /></div>
        <div><h3 className="font-semibold text-sm">Automation Suggestions</h3><p className="text-xs text-gray-400">Improve your test suite</p></div>
      </div>
      <div className="space-y-3">
        {suggestions.map((item) => (
          <div key={item.id} className="group p-3 rounded-lg border border-gray-100 hover:border-amber-200 hover:bg-amber-50/20 transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block mb-1">{item.title}</span>
                <p className="text-xs text-gray-500 leading-relaxed mb-2">{item.description}</p>
                <div className="flex items-center gap-2">
                  <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-medium \${EFF[item.effort]}\`}>Effort: {item.effort}</span>
                  <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-medium \${IMP[item.impact]}\`}>Impact: {item.impact}</span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600"><ArrowRight size={14} /></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`,

  'src/components/dashboard/TeamActivity.jsx': `import { CheckCircle, XCircle, Plus, Search, Wrench, Zap } from 'lucide-react';

const ACT = { ran: { verb: 'ran', color: 'text-brand-500' }, created: { verb: 'created', color: 'text-green-500' }, analyzed: { verb: 'analyzed', color: 'text-purple-500' }, fixed: { verb: 'fixed', color: 'text-amber-500' } };
const RES = { passed: { label: 'Passed', style: 'bg-green-100 text-green-700', icon: CheckCircle }, failed: { label: 'Failed', style: 'bg-red-100 text-red-700', icon: XCircle }, coverage_gaps: { label: 'Gaps Found', style: 'bg-amber-100 text-amber-700', icon: Search } };

export default function TeamActivity({ activities = [] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4"><h3 className="font-semibold text-sm">Recent Activity</h3><p className="text-xs text-gray-400">Latest test operations</p></div>
      <div className="space-y-0">
        {activities.map((a, i) => {
          const cfg = ACT[a.action] || ACT.ran;
          const res = a.result ? RES[a.result] : null;
          return (
            <div key={a.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">{a.avatar}</div>
                {i < activities.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
              </div>
              <div className={\`flex-1 min-w-0 \${i < activities.length - 1 ? 'pb-4' : ''}\`}>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-sm font-medium">{a.user}</span>
                  <span className={\`text-sm \${cfg.color}\`}>{cfg.verb}</span>
                  <span className="text-sm text-gray-600 truncate">{a.target}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{a.time}</span>
                  {res && <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 \${res.style}\`}><res.icon size={10} />{res.label}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}`,
};

// Write all files
Object.entries(files).forEach(([filePath, content]) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log('Created:', filePath);
});

console.log('\\nAll dashboard files created!');
`;

Then run:
```cmd
node create-dashboard.js
```

**Expected:** 7 "Created:" lines. Then check:
```cmd
dir src\components\dashboard
dir src\data
```

Screenshot the result.