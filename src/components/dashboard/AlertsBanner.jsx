import { AlertTriangle, XCircle, Clock, X } from 'lucide-react';
import { useState } from 'react';

export default function AlertsBanner({ alerts }) {
  const [dismissed, setDismissed] = useState({});

  if (!alerts || alerts.length === 0) return null;

  const visibleAlerts = alerts.filter((_, i) => !dismissed[i]);
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        if (dismissed[i]) return null;
        
        const isCritical = alert.type === 'critical';
        
        return (
          <div 
            key={i}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg ${
              isCritical ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            {isCritical ? (
              <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isCritical ? 'text-red-700' : 'text-yellow-700'}`}>
                {alert.message}
              </p>
              {alert.test && (
                <p className={`text-xs mt-0.5 ${isCritical ? 'text-red-500' : 'text-yellow-600'}`}>
                  Test: {alert.test}
                </p>
              )}
              {alert.time && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${isCritical ? 'text-red-400' : 'text-yellow-500'}`}>
                  <Clock size={10} /> {alert.time}
                </p>
              )}
            </div>
            <button 
              onClick={() => setDismissed(prev => ({ ...prev, [i]: true }))}
              className={`p-1 rounded hover:bg-white/50 ${isCritical ? 'text-red-400' : 'text-yellow-400'}`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
