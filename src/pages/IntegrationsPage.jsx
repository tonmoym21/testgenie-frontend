import { Link } from 'react-router-dom';
import { Puzzle, ExternalLink, Library } from 'lucide-react';

export default function IntegrationsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">External tools</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/jira" className="card-interactive p-5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300 flex items-center justify-center mb-3"><ExternalLink size={20} /></div>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100">Jira</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Link test cases to issues, sync results as comments.</p>
        </Link>
        <Link to="/collections" className="card-interactive p-5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300 flex items-center justify-center mb-3"><Library size={20} /></div>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100">Postman / API Collections</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Import collections, generate test cases.</p>
        </Link>
        <div className="card p-5 opacity-60">
          <div className="w-11 h-11 rounded-xl bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400 flex items-center justify-center mb-3"><Puzzle size={20} /></div>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100">More</h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Slack, GitHub, Linear on the roadmap.</p>
        </div>
      </div>
    </div>
  );
}
