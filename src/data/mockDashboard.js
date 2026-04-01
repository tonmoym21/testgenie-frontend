// Mock data for dashboard - replace with real API calls later

export const mockAlerts = [
  { id: 1, type: 'critical', message: 'Login flow test failed 3 consecutive times', test: 'Login Flow - Valid Credentials', time: '12 min ago' },
  { id: 2, type: 'warning', message: 'API response time exceeded 3s threshold', test: 'Checkout API - Create Order', time: '45 min ago' },
];

export const mockInsights = [
  { id: 1, type: 'coverage', title: 'Missing error boundary tests', description: 'Payment module has 0 negative test cases. Add tests for declined cards, timeout, and network errors.', priority: 'high', action: 'Generate Tests' },
  { id: 2, type: 'flaky', title: 'Flaky test detected', description: '"Search Results Load" has passed 6/10 runs this week. Likely a timing issue with async data fetch.', priority: 'medium', action: 'View Details' },
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
  passRate: 87,
  passRateDelta: 4.2,
  totalRuns: 186,
  totalRunsDelta: 12,
  avgDuration: 2340,
  avgDurationDelta: -180,
  flakyTests: 3,
  flakyTestsDelta: -1,
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
];
