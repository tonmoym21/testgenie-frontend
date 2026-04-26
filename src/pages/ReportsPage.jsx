import { Link, useParams } from 'react-router-dom';
import { FileText, BarChart3, Play } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function ReportsPage() {
  const { projectId } = useParams();
  return (
    <div className="page">
      {projectId && <BackButton to="/projects" label="Back" />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Coverage, history, trends</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/dashboard" className="card-interactive p-5">
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 dark:bg-lime-500/10 dark:text-lime-400 flex items-center justify-center mb-3"><BarChart3 size={20} /></div>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100">Dashboards</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Project health at a glance.</p>
        </Link>
        <Link to="/test-runs" className="card-interactive p-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 flex items-center justify-center mb-3"><Play size={20} /></div>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100">Run history</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Past runs, pass rates, failure trends.</p>
        </Link>
        <Link to="/projects" className="card-interactive p-5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300 flex items-center justify-center mb-3"><FileText size={20} /></div>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100">Per-project</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Pick a project for detailed analytics.</p>
        </Link>
      </div>
    </div>
  );
}
