import { Link, useParams } from 'react-router-dom';
import { FileText, BarChart3, Play } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function ReportsPage() {
  const { projectId } = useParams();
  return (
    <div className="page">
      {projectId && <BackButton to="/projects" label="Back to projects" />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Coverage, run history, and trend analysis.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/dashboard" className="card-interactive p-5">
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3"><BarChart3 size={20} /></div>
          <h3 className="font-semibold text-surface-900">Dashboards</h3>
          <p className="text-sm text-surface-500 mt-1">High-level project health and coverage at a glance.</p>
        </Link>
        <Link to="/test-runs" className="card-interactive p-5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><Play size={20} /></div>
          <h3 className="font-semibold text-surface-900">Run History</h3>
          <p className="text-sm text-surface-500 mt-1">Browse past test runs, pass rates, and failure trends.</p>
        </Link>
        <Link to="/projects" className="card-interactive p-5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3"><FileText size={20} /></div>
          <h3 className="font-semibold text-surface-900">Per-Project Reports</h3>
          <p className="text-sm text-surface-500 mt-1">Pick a project to see its detailed analytics.</p>
        </Link>
      </div>
    </div>
  );
}
