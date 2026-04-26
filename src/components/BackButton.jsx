import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ to, label = 'Back', className = '' }) {
  const navigate = useNavigate();
  const base = `inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-100 mb-4 transition-colors ${className}`;

  if (to) {
    return (
      <Link to={to} className={base}>
        <ArrowLeft size={14} /> {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => navigate(-1)} className={base}>
      <ArrowLeft size={14} /> {label}
    </button>
  );
}
