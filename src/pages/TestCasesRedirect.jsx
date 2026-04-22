import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../services/api';
import { getCurrentProjectId, setCurrentProjectId } from '../utils/currentProject';

// Sends the user to the most recent project's Test Cases page, or to /projects if
// they have none selected yet.
export default function TestCasesRedirect() {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    (async () => {
      let id = getCurrentProjectId();
      if (!id) {
        try {
          const res = await api.getProjects({ limit: 1 });
          id = res?.data?.[0]?.id || null;
          if (id) setCurrentProjectId(id);
        } catch { /* ignore */ }
      }
      setTarget(id ? `/projects/${id}/test-cases` : '/projects');
    })();
  }, []);

  if (!target) {
    return (
      <div className="page">
        <div className="empty"><div className="skeleton h-5 w-40" /></div>
      </div>
    );
  }
  return <Navigate to={target} replace />;
}
