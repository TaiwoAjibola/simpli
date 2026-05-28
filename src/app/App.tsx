import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { LoginPage } from './components/LoginPage';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { MyWork } from './components/MyWork';
import { AdminPanel } from './components/AdminPanel';
import { AppsModule } from './components/AppsModule';
import { GoalsModule } from './components/GoalsMilestonesModule';
import { TasksModule } from './components/TasksModule';
import { ActivitiesPage } from './components/ActivitiesPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { TimelinePage } from './components/TimelinePage';
import { ArchivePage } from './components/ArchivePage';
import { DefectDashboard } from './components/DefectDashboard';
import { AppDetailsPage } from './components/AppDetailsPage';
import { ActionPointsPage } from './components/ActionPointsPage';
import { SettingsPage } from './components/SettingsPage';
import { PageLoader } from './components/PageLoader';
import { ToastProvider } from './context/ToastContext';
import { SeedPage } from './components/SeedPage';

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
        {currentPage === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentPage === 'my-work' && <MyWork />}
        {currentPage === 'kanban' && <KanbanBoard />}
        {currentPage === 'analytics' && <AnalyticsPage />}
        {currentPage === 'timeline' && <TimelinePage />}
        {currentPage === 'archive' && <ArchivePage />}
        {currentPage === 'defects' && <DefectDashboard />}
        {currentPage === 'activities' && <ActivitiesPage />}
        {currentPage === 'apps' && <AppsModule onNavigate={handleNavigate} />}
        {currentPage === 'app-details' && <AppDetailsPage appId={selectedAppId} onNavigate={handleNavigate} />}
        {currentPage === 'goals' && <GoalsModule />}
        {currentPage === 'tasks' && <TasksModule />}
        {currentPage === 'action-points' && <ActionPointsPage />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'admin' && <AdminPanel />}
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
