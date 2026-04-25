import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

/**
 * ExecutionTimeline: Vertical timeline of test steps
 * Shows status, duration, and step details
 * Supports click to jump to log entry
 */
export default function ExecutionTimeline({
  steps = [],
  selectedStepIndex = null,
  onStepSelect = () => {},
}) {
  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-8 text-surface-400">
        <Clock size={20} className="mx-auto mb-2 opacity-40" />
        <p className="text-xs">No steps</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-500" />;
      default:
        return <Clock size={16} className="text-surface-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
      case 'success':
        return 'bg-emerald-50 hover:bg-emerald-100';
      case 'failed':
        return 'bg-red-50 hover:bg-red-100';
      case 'warning':
        return 'bg-amber-50 hover:bg-amber-100';
      default:
        return 'bg-surface-50 hover:bg-surface-100';
    }
  };

  return (
    <div className="space-y-1">
      {steps.map((step, idx) => {
        const isSelected = idx === selectedStepIndex;

        return (
          <div
            key={idx}
            onClick={() => onStepSelect(idx)}
            className={`relative p-3 rounded-lg cursor-pointer transition-colors ${
              isSelected ? 'bg-brand-100 ring-2 ring-brand-500' : getStatusColor(step.status)
            }`}
          >
            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div className="absolute left-[26px] top-full w-0.5 h-2 bg-surface-200" />
            )}

            {/* Step content */}
            <div className="flex items-start gap-2">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(step.status)}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-900 truncate">
                  {step.name || `Step ${idx + 1}`}
                </p>
                {step.duration && (
                  <p className="text-xs text-surface-500 mt-0.5">
                    {step.duration}ms
                  </p>
                )}
                {step.description && (
                  <p className="text-xs text-surface-600 mt-1 line-clamp-2">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {/* Hover indicator */}
            {isSelected && (
              <div className="absolute inset-0 rounded-lg border-2 border-brand-500 pointer-events-none" />
            )}
          </div>
        );
      })}
    </div>
  );
}
