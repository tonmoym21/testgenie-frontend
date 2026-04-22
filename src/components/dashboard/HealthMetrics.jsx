import { TrendingUp, TrendingDown, Activity, Clock, Zap, AlertTriangle } from 'lucide-react';

const METRICS_CONFIG = [
  {
    key: 'passRate',
    label: 'Pass Rate',
    icon: Activity,
    format: (v) => `${v}%`,
    deltaKey: 'passRateDelta',
    deltaFormat: (v) => `${v > 0 ? '+' : ''}${v}%`,
    color: (v) => v >= 80 ? 'text-green-600 bg-green-50' : v >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50',
  },
  {
    key: 'totalRuns',
    label: 'Total Runs',
    icon: Zap,
    format: (v) => v.toLocaleString(),
    deltaKey: 'totalRunsDelta',
    deltaFormat: (v) => `${v > 0 ? '+' : ''}${v} today`,
    color: () => 'text-brand-600 bg-brand-50',
  },
  {
    key: 'avgDuration',
    label: 'Avg Duration',
    icon: Clock,
    format: (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`,
    deltaKey: 'avgDurationDelta',
    deltaFormat: (v) => `${v > 0 ? '+' : ''}${v}ms`,
    color: () => 'text-purple-600 bg-purple-50',
    invertDelta: true,
  },
  {
    key: 'flakyTests',
    label: 'Flaky Tests',
    icon: AlertTriangle,
    format: (v) => v,
    deltaKey: 'flakyTestsDelta',
    deltaFormat: (v) => `${v > 0 ? '+' : ''}${v}`,
    color: (v) => v === 0 ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50',
    invertDelta: true,
  },
];

export default function HealthMetrics({ metrics = {} }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {METRICS_CONFIG.map(({ key, label, icon: Icon, format, deltaKey, deltaFormat, color, invertDelta }) => {
        const value = metrics[key];
        const delta = metrics[deltaKey];
        const isPositive = invertDelta ? delta < 0 : delta > 0;

        return (
          <div key={key} className="bg-white rounded-xl border border-surface-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color(value)}`}>
                <Icon size={18} />
              </div>
              {delta !== undefined && delta !== 0 && (
                <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {deltaFormat(delta)}
                </div>
              )}
            </div>
            <div className="text-2xl font-semibold tracking-tight">{format(value)}</div>
            <div className="text-xs text-surface-400 mt-0.5">{label}</div>
          </div>
        );
      })}
    </div>
  );
}
