import { useState } from 'react';

export default function FailureTrends({ data = [] }) {
  const [hoveredDay, setHoveredDay] = useState(null);
  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">Failure Trends</h3>
          <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> Passed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Failed</span>
        </div>
      </div>

      <div className="flex items-end gap-3 h-40">
        {data.map((day, i) => {
          const passedHeight = (day.passed / maxVal) * 100;
          const failedHeight = (day.failed / maxVal) * 100;
          const isHovered = hoveredDay === i;

          return (
            <div
              key={day.day}
              className="flex-1 flex flex-col items-center gap-1 relative"
              onMouseEnter={() => setHoveredDay(i)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-lg">
                  <div className="font-medium mb-1">{day.day}</div>
                  <div className="flex gap-3">
                    <span className="text-green-300">{day.passed} passed</span>
                    <span className="text-red-300">{day.failed} failed</span>
                  </div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
                </div>
              )}

              {/* Bar */}
              <div className="w-full flex flex-col justify-end h-32 gap-0.5">
                <div
                  className="w-full bg-red-400 rounded-t transition-all duration-300"
                  style={{ height: `${failedHeight}%`, minHeight: day.failed > 0 ? '4px' : '0' }}
                />
                <div
                  className="w-full bg-green-400 rounded-b transition-all duration-300"
                  style={{ height: `${passedHeight}%`, minHeight: '4px' }}
                />
              </div>

              {/* Label */}
              <span className={`text-xs transition-colors ${isHovered ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {day.day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <span>Total: {data.reduce((s, d) => s + d.total, 0)} runs</span>
        <span>Failures: {data.reduce((s, d) => s + d.failed, 0)}</span>
        <span>
          Rate: {Math.round((data.reduce((s, d) => s + d.passed, 0) / Math.max(data.reduce((s, d) => s + d.total, 0), 1)) * 100)}%
        </span>
      </div>
    </div>
  );
}
