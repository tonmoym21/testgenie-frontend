import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * TrendCard: Compact metric card with sparkline, value, and trend delta
 *
 * Usage:
 * <TrendCard
 *   label="Pass Rate"
 *   value="92%"
 *   trend={+5}
 *   data={[90, 88, 92, 91, 93]}
 *   color="emerald"
 * />
 */
export default function TrendCard({
  label,
  value,
  trend,
  data = [],
  color = 'brand',
  icon: Icon = null,
}) {
  // Determine colors based on tone
  const colors = {
    brand:   { bg: 'bg-brand-50', text: 'text-brand-600', ring: 'ring-brand-600/10', line: 'stroke-brand-500' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-600/10', line: 'stroke-emerald-500' },
    danger:  { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-600/10', line: 'stroke-red-500' },
    warn:    { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-600/10', line: 'stroke-amber-500' },
    purple:  { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-600/10', line: 'stroke-purple-500' },
  };

  const style = colors[color] || colors.brand;
  const isPositive = trend >= 0;
  const trendColor = isPositive ? 'text-emerald-600' : 'text-red-600';

  // Generate SVG sparkline from data
  const renderSparkline = () => {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 24;
    const padding = 2;

    // Calculate points for polyline
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
        <polyline
          points={points}
          fill="none"
          className={style.line}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className={`${style.bg} rounded-lg p-4 ring-1 ring-inset ${style.ring} flex items-start gap-3`}>
      {/* Icon or Sparkline */}
      <div className="flex-shrink-0">
        {Icon ? (
          <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center`}>
            <Icon size={18} className={style.text} />
          </div>
        ) : (
          <div className="flex-shrink-0">
            {renderSparkline()}
          </div>
        )}
      </div>

      {/* Metric info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-surface-600 uppercase tracking-wider font-semibold">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={`text-xl font-semibold ${style.text}`}>{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
