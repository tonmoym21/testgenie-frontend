import { Wand2, ArrowRight } from 'lucide-react';

const EFFORT_STYLE = {
  Low: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-red-100 text-red-700',
};

const IMPACT_STYLE = {
  High: 'bg-blue-100 text-blue-700',
  Medium: 'bg-surface-100 text-surface-600',
  Low: 'bg-surface-50 text-surface-500',
};

export default function AutomationSuggestions({ suggestions = [] }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
            <Wand2 size={14} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-surface-900">Automation Suggestions</h3>
            <p className="text-xs text-surface-400">Improve your test suite</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.map((item) => (
          <div
            key={item.id}
            className="group p-3 rounded-lg border border-surface-100 hover:border-amber-200 hover:bg-amber-50/20 transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-surface-900 block mb-1">{item.title}</span>
                <p className="text-xs text-surface-500 leading-relaxed mb-2">{item.description}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${EFFORT_STYLE[item.effort]}`}>
                    Effort: {item.effort}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${IMPACT_STYLE[item.impact]}`}>
                    Impact: {item.impact}
                  </span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
