import StoriesPage from './pages/StoriesPage';
import CreateStoryPage from './pages/CreateStoryPage';
import StoryDetailPage from './pages/StoryDetailPage';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApiDashboardPage from './pages/ApiDashboardPage';
import AutomationDashboardPage from './pages/AutomationDashboardPage';
import RunReportDetailPage from './pages/RunReportDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectTestCasesPage from './pages/ProjectTestCasesPage';
import ExecutionsPage from './pages/ExecutionsPage';
import ExecutionDetailPage from './pages/ExecutionDetailPage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import EnvironmentsPage from './pages/EnvironmentsPage';
import SchedulesPage from './pages/SchedulesPage';
import AutomationPage from './pages/AutomationPage';
import AutomationAssetDetailPage from './pages/AutomationAssetDetailPage';
import TeamPage from './pages/TeamPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import GlobalsPage from './pages/GlobalsPage';
import JiraPage from './pages/JiraPage';
import TestPlansPage from './pages/TestPlansPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import IntegrationsPage from './pages/IntegrationsPage';
import TestCasesRedirect from './pages/TestCasesRedirect';
import TestRunsPage from './pages/TestRunsPage';
import CreateTestRunPage from './pages/CreateTestRunPage';
import TestRunDetailPage from './pages/TestRunDetailPage';
import InsightsPage from './pages/InsightsPage';

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
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Dashboards */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/api" element={<ProtectedRoute><ApiDashboardPage /></ProtectedRoute>} />
      <Route path="/dashboard/automation" element={<ProtectedRoute><AutomationDashboardPage /></ProtectedRoute>} />

      {/* Reports */}
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/reports/:reportId" element={<ProtectedRoute><RunReportDetailPage /></ProtectedRoute>} />

      {/* Projects */}
      <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/test-cases" element={<ProtectedRoute><ProjectTestCasesPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/test-plans" element={<ProtectedRoute><TestPlansPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/stories" element={<ProtectedRoute><StoriesPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/stories/new" element={<ProtectedRoute><CreateStoryPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/stories/:storyId" element={<ProtectedRoute><StoryDetailPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/automation" element={<ProtectedRoute><AutomationPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/automation/:assetId" element={<ProtectedRoute><AutomationAssetDetailPage /></ProtectedRoute>} />

      {/* Top-level Test Cases — redirects to current project */}
      <Route path="/test-cases" element={<ProtectedRoute><TestCasesRedirect /></ProtectedRoute>} />

      {/* Test Runs */}
      <Route path="/test-runs" element={<ProtectedRoute><TestRunsPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/test-runs/new" element={<ProtectedRoute><CreateTestRunPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/test-runs/:runId" element={<ProtectedRoute><TestRunDetailPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/test-runs" element={<ProtectedRoute><TestRunsPage /></ProtectedRoute>} />
      <Route path="/executions" element={<ProtectedRoute><ExecutionsPage /></ProtectedRoute>} />
      <Route path="/executions/:executionId" element={<ProtectedRoute><ExecutionDetailPage /></ProtectedRoute>} />

      {/* Test Plans */}
      <Route path="/test-plans" element={<ProtectedRoute><TestPlansPage /></ProtectedRoute>} />

      {/* Integrations */}
      <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} />
      <Route path="/jira" element={<ProtectedRoute><JiraPage /></ProtectedRoute>} />

      {/* Settings (Team / Environments / Globals) */}
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
      <Route path="/environments" element={<ProtectedRoute><EnvironmentsPage /></ProtectedRoute>} />
      <Route path="/globals" element={<ProtectedRoute><GlobalsPage /></ProtectedRoute>} />

      {/* Legacy / other */}
      <Route path="/run-test" element={<Navigate to="/projects" replace />} />
      <Route path="/collections" element={<ProtectedRoute><CollectionsPage /></ProtectedRoute>} />
      <Route path="/collections/:collectionId" element={<ProtectedRoute><CollectionDetailPage /></ProtectedRoute>} />
      <Route path="/schedules" element={<ProtectedRoute><SchedulesPage /></ProtectedRoute>} />
      <Route path="/stories" element={<ProtectedRoute><StoriesPage /></ProtectedRoute>} />
      <Route path="/automation" element={<ProtectedRoute><AutomationPage /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
