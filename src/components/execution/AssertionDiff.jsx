import { CheckCircle2, XCircle } from 'lucide-react';

/**
 * AssertionDiff: Display assertion results with expected vs actual comparison
 * Shows pass/fail status and diffs
 */
export default function AssertionDiff({ assertions = [] }) {
  if (!assertions || assertions.length === 0) {
    return (
      <div className="text-center py-8 text-surface-400">
        <p className="text-sm">No assertions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assertions.map((assertion, idx) => {
        const isPassed = assertion.passed;

        return (
          <div
            key={idx}
            className={`rounded-lg border p-3 ${
              isPassed
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {isPassed ? (
                  <CheckCircle2 size={14} className="text-emerald-600" />
                ) : (
                  <XCircle size={14} className="text-red-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${isPassed ? 'text-emerald-900' : 'text-red-900'}`}>
                  {assertion.name || `Assertion ${idx + 1}`}
                </p>
                <p className={`text-xs mt-1 ${isPassed ? 'text-emerald-700' : 'text-red-700'}`}>
                  {assertion.description}
                </p>
              </div>
            </div>

            {/* Comparison */}
            {!isPassed && (assertion.expected || assertion.actual) && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/50 rounded p-2 border border-red-200">
                  <p className="font-semibold text-surface-700 mb-1">Expected</p>
                  <code className="text-[11px] text-surface-600 break-words">
                    {typeof assertion.expected === 'string'
                      ? assertion.expected
                      : JSON.stringify(assertion.expected, null, 2)}
                  </code>
                </div>
                <div className="bg-white/50 rounded p-2 border border-red-200">
                  <p className="font-semibold text-surface-700 mb-1">Actual</p>
                  <code className="text-[11px] text-surface-600 break-words">
                    {typeof assertion.actual === 'string'
                      ? assertion.actual
                      : JSON.stringify(assertion.actual, null, 2)}
                  </code>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
