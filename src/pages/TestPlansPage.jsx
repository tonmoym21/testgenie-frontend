import { useParams } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function TestPlansPage() {
  const { projectId } = useParams();
  return (
    <div className="page">
      {projectId && <BackButton to="/projects" label="Back to projects" />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Test Plans</h1>
          <p className="page-subtitle">Group related test cases into reusable execution plans.</p>
        </div>
      </div>
      <div className="empty">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
          <BookOpen size={24} />
        </div>
        <h3 className="text-lg font-semibold text-surface-800 mb-1">Test Plans are coming soon</h3>
        <p className="text-surface-500 text-sm max-w-sm">
          Define a plan once, then run it against any environment. Use Test Cases and Test Runs today
          to get similar coverage.
        </p>
      </div>
    </div>
  );
}
