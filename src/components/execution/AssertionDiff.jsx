import { CheckCircle2, XCircle } from 'lucide-react';

/**
 * AssertionDiff: Display assertion results with expected vs actual comparison
 * Shows pass/fail status and diffs
 */
export default function AssertionDiff({ assertions = [] }) {
  if (!assertions || assertions.length === 0) {
    return (
      <div className="text-center py-8 text-surface-400 dark:text-surface-500">
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
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-400/30'
                : 'bg-red-50 border-red-200 dark:bg-red-500/5 dark:border-red-400/30'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {isPassed ? (
                  <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle size={14} className="text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${isPassed ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-200'}`}>
                  {assertion.name || `Assertion ${idx + 1}`}
                </p>
                <p className={`text-xs mt-1 ${isPassed ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {assertion.description}
                </p>
              </div>
            </div>

            {!isPassed && (assertion.expected || assertion.actual) && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/50 dark:bg-surface-900/40 rounded p-2 border border-red-200 dark:border-red-400/20">
                  <p className="font-semibold text-surface-700 dark:text-surface-300 mb-1">Expected</p>
                  <code className="text-[11px] text-surface-600 dark:text-surface-300 break-words font-mono">
                    {typeof assertion.expected === 'string'
                      ? assertion.expected
                      : JSON.stringify(assertion.expected, null, 2)}
                  </code>
                </div>
                <div className="bg-white/50 dark:bg-surface-900/40 rounded p-2 border border-red-200 dark:border-red-400/20">
                  <p className="font-semibold text-surface-700 dark:text-surface-300 mb-1">Actual</p>
                  <code className="text-[11px] text-surface-600 dark:text-surface-300 break-words font-mono">
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
