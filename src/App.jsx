import StoriesPage from './pages/StoriesPage';
import CreateStoryPage from './pages/CreateStoryPage';
import StoryDetailPage from './pages/StoryDetailPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ExecutionsPage from './pages/ExecutionsPage';
import ExecutionDetailPage from './pages/ExecutionDetailPage';
import RunTestPage from './pages/RunTestPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import EnvironmentsPage from './pages/EnvironmentsPage';
import SchedulesPage from './pages/SchedulesPage';
import AutomationPage from './pages/AutomationPage';
import AutomationAssetDetailPage from './pages/AutomationAssetDetailPage';
import TeamPage from './pages/TeamPage';
import AcceptInvitePage from './pages/AcceptInvitePage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/automation" element={<ProtectedRoute><AutomationPage /></ProtectedRoute>} />
      <Route path="/automation" element={<ProtectedRoute><AutomationPage /></ProtectedRoute>} />
      <Route path="/stories" element={<ProtectedRoute><StoriesPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/stories" element={<ProtectedRoute><StoriesPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/stories/new" element={<ProtectedRoute><CreateStoryPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/stories/:storyId" element={<ProtectedRoute><StoryDetailPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/automation" element={<ProtectedRoute><AutomationPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/automation/:assetId" element={<ProtectedRoute><AutomationAssetDetailPage /></ProtectedRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
      <Route path="/run-test" element={<ProtectedRoute><RunTestPage /></ProtectedRoute>} />
      <Route path="/collections" element={<ProtectedRoute><CollectionsPage /></ProtectedRoute>} />
      <Route path="/collections/:collectionId" element={<ProtectedRoute><CollectionDetailPage /></ProtectedRoute>} />
      <Route path="/environments" element={<ProtectedRoute><EnvironmentsPage /></ProtectedRoute>} />
      <Route path="/schedules" element={<ProtectedRoute><SchedulesPage /></ProtectedRoute>} />
      <Route path="/executions" element={<ProtectedRoute><ExecutionsPage /></ProtectedRoute>} />
      <Route path="/executions/:executionId" element={<ProtectedRoute><ExecutionDetailPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
    </Routes>
  );
}
