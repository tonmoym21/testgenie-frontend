import { TrendingUp, TrendingDown } from 'lucide-react';

export default function TrendCard({
  label,
  value,
  trend,
  data = [],
  color = 'brand',
  icon: Icon = null,
}) {
  const colors = {
    brand:   { bg: 'bg-brand-50 dark:bg-brand-500/10',     text: 'text-brand-600 dark:text-brand-300',     ring: 'ring-brand-600/10 dark:ring-brand-400/20',     line: 'stroke-brand-500 dark:stroke-brand-400' },
    success: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-emerald-600/10 dark:ring-emerald-400/20', line: 'stroke-emerald-500 dark:stroke-emerald-400' },
    danger:  { bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-300',         ring: 'ring-red-600/10 dark:ring-red-400/20',         line: 'stroke-red-500 dark:stroke-red-400' },
    warn:    { bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-300',     ring: 'ring-amber-600/10 dark:ring-amber-400/20',     line: 'stroke-amber-500 dark:stroke-amber-400' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-500/10',   text: 'text-purple-600 dark:text-purple-300',   ring: 'ring-purple-600/10 dark:ring-purple-400/20',   line: 'stroke-purple-500 dark:stroke-purple-400' },
    lime:    { bg: 'bg-lime-50 dark:bg-lime-500/10',       text: 'text-lime-700 dark:text-lime-300',       ring: 'ring-lime-600/15 dark:ring-lime-400/25',       line: 'stroke-lime-500 dark:stroke-lime-400' },
  };

  const style = colors[color] || colors.brand;
  const isPositive = trend >= 0;
  const trendColor = isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
  const hasSpark = Array.isArray(data) && data.length >= 2;

  const sparkline = (() => {
    if (!hasSpark) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 72;
    const height = 28;
    const padding = 2;
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
        <polyline
          points={points}
          fill="none"
          className={style.line}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  })();

  return (
    <div className={`${style.bg} rounded-lg p-4 ring-1 ring-inset ${style.ring} flex items-center gap-3`}>
      {Icon && (
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white/60 dark:bg-white/5`}>
          <Icon size={17} className={style.text} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-surface-600 dark:text-surface-400 uppercase tracking-wider font-semibold">{label}</p>
        <div className="flex items-baseline gap-2 mt-0.5">
          <p className={`text-xl font-semibold tabular-nums ${style.text}`}>{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span className="tabular-nums">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </div>

      {sparkline}
    </div>
  );
}
