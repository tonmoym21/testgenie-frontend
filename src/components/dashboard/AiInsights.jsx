import { Lightbulb, Shield, RefreshCw, Target, ChevronRight } from 'lucide-react';

const INSIGHT_ICONS = {
  coverage: { icon: Target, color: 'text-blue-500 bg-blue-50' },
  flaky: { icon: RefreshCw, color: 'text-amber-500 bg-amber-50' },
  optimization: { icon: Lightbulb, color: 'text-purple-500 bg-purple-50' },
  risk: { icon: Shield, color: 'text-red-500 bg-red-50' },
};

const PRIORITY_STYLE = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-surface-100 text-surface-600',
};

export default function AiInsights({ insights = [] }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <Lightbulb size={14} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-surface-900">AI Insights</h3>
            <p className="text-xs text-surface-400">{insights.length} recommendations</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => {
          const { icon: Icon, color } = INSIGHT_ICONS[insight.type] || INSIGHT_ICONS.coverage;

          return (
            <div
              key={insight.id}
              className="group p-3 rounded-lg border border-surface-100 hover:border-brand-200 hover:bg-brand-50/20 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-900">{insight.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_STYLE[insight.priority]}`}>
                      {insight.priority}
                    </span>
                  </div>
                  <p className="text-xs text-surface-500 leading-relaxed">{insight.description}</p>
                  <button className="mt-2 text-xs text-brand-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {insight.action} <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
