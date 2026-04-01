import { useState } from 'react';
import { AlertTriangle, X, ExternalLink } from 'lucide-react';

export default function AlertsBanner({ alerts = [] }) {
  const [dismissed, setDismissed] = useState([]);

  const visible = alerts.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id) => setDismissed((prev) => [...prev, id]);

  return (
    <div className="space-y-2 mb-6">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
            alert.type === 'critical'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}
        >
          <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${alert.type === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="flex-1 min-w-0">
            <span className="font-medium">{alert.message}</span>
            <span className="text-xs opacity-60 ml-2">{alert.time}</span>
            {alert.test && (
              <div className="mt-1 flex items-center gap-1 text-xs opacity-70">
                <span className="font-mono">{alert.test}</span>
              </div>
            )}
          </div>
          <button onClick={() => dismiss(alert.id)} className="p-0.5 opacity-40 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
