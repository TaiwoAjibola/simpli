import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './components/LoginPage';
import { Navigation } from './components/Navigation';
import { PageLoader } from './components/PageLoader';
import { ToastProvider } from './context/ToastContext';
import { SeedPage } from './components/SeedPage';

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const TasksModule = lazy(() => import('./components/TasksModule').then(m => ({ default: m.TasksModule })));
const CalendarPage = lazy(() => import('./components/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ClientsPage = lazy(() => import('./components/ClientsPage').then(m => ({ default: m.ClientsPage })));
const TeamPage = lazy(() => import('./components/TeamPage').then(m => ({ default: m.TeamPage })));
const DocumentsPage = lazy(() => import('./components/DocumentsPage').then(m => ({ default: m.DocumentsPage })));
const MilestonesPage = lazy(() => import('./components/MilestonesPage').then(m => ({ default: m.MilestonesPage })));
const ReportsPage = lazy(() => import('./components/ReportsPage').then(m => ({ default: m.ReportsPage })));
const NotificationsPage = lazy(() => import('./components/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProjectsPage = lazy(() => import('./components/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const GoalsMilestonesModule = lazy(() => import('./components/GoalsMilestonesModule').then(m => ({ default: m.GoalsMilestonesModule })));
const InsightsPage = lazy(() => import('./components/InsightsPage').then(m => ({ default: m.InsightsPage })));

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
    <div className="h-screen flex bg-[#FAF5FF]">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<PageLoader message="Loading..." />}>
          <div key={currentPage} className="animate-fade-up h-full">
            {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
            {currentPage === 'projects' && <ProjectsPage onNavigate={handleNavigate} />}
            {currentPage === 'tasks' && <TasksModule />}
            {currentPage === 'calendar' && <CalendarPage />}
            {currentPage === 'clients' && <ClientsPage />}
            {currentPage === 'team' && <TeamPage />}
            {currentPage === 'documents' && <DocumentsPage />}
            {currentPage === 'milestones' && <MilestonesPage />}
            {currentPage === 'reports' && <ReportsPage />}
            {currentPage === 'notifications' && <NotificationsPage />}
            {currentPage === 'admin' && <AdminPanel />}
          </div>
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

  // Global log handlers (UI errors, unhandled rejections)
  useEffect(() => {
    import('../utils/logger').then(({ attachGlobalLogHandlers }) => {
      const detach = attachGlobalLogHandlers();
      // keep for session
      (window as any).__simpliDetachLogs = detach;
    });
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
