/**
 * FailureTrends Component
 * Displays a bar chart of daily test pass/fail counts
 */

export default function FailureTrends({ dailyTrend }) {
  if (!dailyTrend || dailyTrend.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400">
        <p className="text-sm">No trend data available yet. Run some tests to see trends!</p>
      </div>
    );
  }

  const maxTotal = Math.max(...dailyTrend.map(d => (d.total || d.passed + d.failed || 0)), 1);

  return (
    <div className="h-48 flex items-end gap-1">
      {dailyTrend.slice(-30).map((d, i) => {
        const total = d.total || (d.passed + d.failed) || 0;
        const passed = d.passed || 0;
        const failed = d.failed || 0;
        const passedHeight = (passed / maxTotal) * 100;
        const failedHeight = (failed / maxTotal) * 100;
        const date = d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Day ${i + 1}`;
        
        return (
          <div 
            key={i} 
            className="flex-1 flex flex-col gap-0.5 group relative"
            title={`${date}: ${passed} passed, ${failed} failed`}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                <div className="font-medium">{date}</div>
                <div className="text-green-300">{passed} passed</div>
                <div className="text-red-300">{failed} failed</div>
              </div>
            </div>
            
            {/* Bars */}
            <div 
              className="bg-red-400 rounded-t transition-all" 
              style={{ height: `${failedHeight}%`, minHeight: failed ? 2 : 0 }} 
            />
            <div 
              className="bg-green-400 rounded-b transition-all" 
              style={{ height: `${passedHeight}%`, minHeight: passed ? 2 : 0 }} 
            />
          </div>
        );
      })}
    </div>
  );
}
