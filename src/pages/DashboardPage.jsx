import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Loader2, Download } from 'lucide-react';

import AlertsBanner from '../components/dashboard/AlertsBanner';
import HealthMetrics from '../components/dashboard/HealthMetrics';
import FailureTrends from '../components/dashboard/FailureTrends';
import AiInsights from '../components/dashboard/AiInsights';
import AutomationSuggestions from '../components/dashboard/AutomationSuggestions';
import TeamActivity from '../components/dashboard/TeamActivity';

import {
  mockAlerts,
  mockInsights,
  mockFailureTrend,
  mockHealthMetrics,
  mockSuggestions,
  mockTeamActivity,
} from '../data/mockDashboard';

export default function DashboardPage() {
  const [realStats, setRealStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.request('GET', '/reports/summary');
        setRealStats(data);
      } catch (err) {
        console.error('Dashboard stats load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Merge real stats with mock data for a rich dashboard
  const metrics = realStats && realStats.total > 0
    ? {
        passRate: realStats.passRate,
        passRateDelta: 0,
        totalRuns: realStats.total,
        totalRunsDelta: 0,
        avgDuration: realStats.avgDuration?.[0]?.avgDurationMs || 0,
        avgDurationDelta: 0,
        flakyTests: 0,
        flakyTestsDelta: 0,
      }
    : mockHealthMetrics;

  const trendData = realStats?.dailyTrend?.length > 0
    ? realStats.dailyTrend.map((d) => ({
        day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
        passed: d.passed,
        failed: d.failed,
        total: d.total,
      }))
    : mockFailureTrend;

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.request('GET', '/reports/export');
      const csv = convertToCSV(data.data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `testforge-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 size={24} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">QA health at a glance</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary text-sm">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          Export
        </button>
      </div>

      {/* Alerts */}
      <AlertsBanner alerts={mockAlerts} />

      {/* Health Metrics */}
      <HealthMetrics metrics={metrics} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Failure Trends - takes 2 columns */}
        <div className="lg:col-span-2">
          <FailureTrends data={trendData} />
        </div>

        {/* Team Activity */}
        <div>
          <TeamActivity activities={mockTeamActivity} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <AiInsights insights={mockInsights} />

        {/* Automation Suggestions */}
        <AutomationSuggestions suggestions={mockSuggestions} />
      </div>
    </div>
  );
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}
