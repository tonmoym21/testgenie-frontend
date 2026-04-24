import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Activity, ClipboardList, Play, BookOpen, FileText, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { setCurrentProjectId } from '../utils/currentProject';

export default function InsightsPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState({ testCases: 0, testRuns: 0, testPlans: 0, reports: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) setCurrentProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const p = await api.get(`/projects/${projectId}`).catch(() => null);
        if (!cancelled && p) setProject(p.data || p);

        const [tcRes, trRes] = await Promise.all([
          api.get(`/projects/${projectId}/test-cases`).catch(() => ({ data: [] })),
          api.get(`/projects/${projectId}/test-runs`).catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          const tc = tcRes.data || tcRes || [];
          const tr = trRes.data || trRes || [];
          setStats({
            testCases: Array.isArray(tc) ? tc.length : (tc.items?.length || 0),
            testRuns: Array.isArray(tr) ? tr.length : (tr.items?.length || 0),
            testPlans: 0,
            reports: 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (projectId) load();
    return () => { cancelled = true; };
  }, [projectId]);

  const cards = [
    { label: 'Test Cases', count: stats.testCases, icon: ClipboardList, to: `/projects/${projectId}/test-cases`, color: 'text-brand-600 bg-brand-50' },
    { label: 'Test Runs', count: stats.testRuns, icon: Play, to: `/projects/${projectId}/test-runs`, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Test Plans', count: stats.testPlans, icon: BookOpen, to: `/projects/${projectId}/test-plans`, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Reports', count: stats.reports, icon: FileText, to: `/projects/${projectId}/reports`, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Activity size={22} className="text-brand-600" />
            Project Insights
          </h1>
          <p className="page-subtitle">
            {project?.name ? `Overview for ${project.name}` : 'Overview of project activity and coverage.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-surface-500">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading insights…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                to={c.to}
                className="card p-5 hover:shadow-md transition-shadow group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                  <Icon size={18} />
                </div>
                <div className="text-2xl font-semibold text-surface-900">{c.count}</div>
                <div className="text-sm text-surface-500 mt-1 group-hover:text-brand-600">{c.label}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
