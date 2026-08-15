import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './components/LoginPage';
import { Navigation } from './components/Navigation';
import { PageLoader } from './components/PageLoader';
import { ToastProvider } from './context/ToastContext';
import { SeedPage } from './components/SeedPage';

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const KanbanBoard = lazy(() => import('./components/KanbanBoard').then(m => ({ default: m.KanbanBoard })));
const MyWork = lazy(() => import('./components/MyWork').then(m => ({ default: m.MyWork })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const AppsModule = lazy(() => import('./components/AppsModule').then(m => ({ default: m.AppsModule })));
const GoalsModule = lazy(() => import('./components/GoalsMilestonesModule').then(m => ({ default: m.GoalsModule })));
const TasksModule = lazy(() => import('./components/TasksModule').then(m => ({ default: m.TasksModule })));
const InsightsPage = lazy(() => import('./components/InsightsPage').then(m => ({ default: m.InsightsPage })));
const DefectDashboard = lazy(() => import('./components/DefectDashboard').then(m => ({ default: m.DefectDashboard })));
const AppDetailsPage = lazy(() => import('./components/AppDetailsPage').then(m => ({ default: m.AppDetailsPage })));
const ActionPointsPage = lazy(() => import('./components/ActionPointsPage').then(m => ({ default: m.ActionPointsPage })));
const GateReview = lazy(() => import('./components/GateReview').then(m => ({ default: m.GateReview })));
const SprintsPage = lazy(() => import('./components/SprintsPage').then(m => ({ default: m.SprintsPage })));
const WorkTemplatesPage = lazy(() => import('./components/WorkTemplatesPage').then(m => ({ default: m.WorkTemplatesPage })));
const AutomationsPage = lazy(() => import('./components/AutomationsPage').then(m => ({ default: m.AutomationsPage })));
const PortfolioPage = lazy(() => import('./components/PortfolioPage').then(m => ({ default: m.PortfolioPage })));
const RepositoriesPage = lazy(() => import('./components/RepositoriesPage').then(m => ({ default: m.RepositoriesPage })));
const IntegrationsPage = lazy(() => import('./components/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })));

function AppContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const { loading: appLoading } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string>('');

  const handleNavigate = (page: string, appId?: string) => {
    setCurrentPage(page);
    if (appId) setSelectedAppId(appId);
  };

  if (authLoading || appLoading) {
    return <PageLoader message="Loading Simpli..." />;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen flex bg-[#0a0a0f]">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<PageLoader message="Loading..." />}>
          {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {currentPage === 'my-work' && <MyWork />}
          {currentPage === 'kanban' && <KanbanBoard />}
          {currentPage === 'insights' && <InsightsPage />}
          {currentPage === 'defects' && <DefectDashboard />}
          {currentPage === 'apps' && <AppsModule onNavigate={handleNavigate} />}
          {currentPage === 'app-details' && <AppDetailsPage appId={selectedAppId} onNavigate={handleNavigate} />}
          {currentPage === 'goals' && <GoalsModule />}
          {currentPage === 'tasks' && <TasksModule />}
          {currentPage === 'action-points' && <ActionPointsPage />}
          {currentPage === 'sprints' && <SprintsPage />}
          {currentPage === 'templates' && <WorkTemplatesPage />}
          {currentPage === 'automations' && <AutomationsPage />}
          {currentPage === 'portfolio' && <PortfolioPage onNavigate={handleNavigate} />}
          {currentPage === 'repositories' && <RepositoriesPage />}
          {currentPage === 'integrations' && <IntegrationsPage />}
          {currentPage === 'gate-review' && <GateReview />}
          {currentPage === 'admin' && <AdminPanel />}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  const [showSeed, setShowSeed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('seed') === 'true') {
      setShowSeed(true);
    }
  }, []);

  if (showSeed) {
    return <SeedPage />;
  }

  return (
    <AuthProvider>
      <AppProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AppProvider>
    </AuthProvider>
  );
}
