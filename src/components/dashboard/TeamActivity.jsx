import { CheckCircle, XCircle, Plus, Search, Wrench, Zap } from 'lucide-react';

const ACTION_CONFIG = {
  ran: { verb: 'ran', icon: Zap, color: 'text-brand-500' },
  created: { verb: 'created', icon: Plus, color: 'text-green-500' },
  analyzed: { verb: 'analyzed', icon: Search, color: 'text-purple-500' },
  fixed: { verb: 'fixed', icon: Wrench, color: 'text-amber-500' },
};

const RESULT_BADGE = {
  passed: { label: 'Passed', style: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed: { label: 'Failed', style: 'bg-red-100 text-red-700', icon: XCircle },
  coverage_gaps: { label: 'Gaps Found', style: 'bg-amber-100 text-amber-700', icon: Search },
};

export default function TeamActivity({ activities = [] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">Recent Activity</h3>
          <p className="text-xs text-gray-400">Latest test operations</p>
        </div>
      </div>

      <div className="space-y-0">
        {activities.map((activity, i) => {
          const config = ACTION_CONFIG[activity.action] || ACTION_CONFIG.ran;
          const resultConfig = activity.result ? RESULT_BADGE[activity.result] : null;
          const isLast = i === activities.length - 1;

          return (
            <div key={activity.id} className="flex gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                  {activity.avatar}
                </div>
                {!isLast && <div className="w-px flex-1 bg-gray-100 my-1" />}
              </div>

              {/* Content */}
              <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{activity.user}</span>
                  <span className={`text-sm ${config.color}`}>{config.verb}</span>
                  <span className="text-sm text-gray-600 truncate">{activity.target}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{activity.time}</span>
                  {resultConfig && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${resultConfig.style}`}>
                      <resultConfig.icon size={10} />
                      {resultConfig.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
