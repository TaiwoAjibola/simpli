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
import { SeedPage } from './components/SeedPage';

function AppContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const { loading: appLoading } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (authLoading || appLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-[#f0f0f5] text-lg">Loading Simpli...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen flex bg-[#0a0a0f]">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-y-auto">
        {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
        {currentPage === 'my-work' && <MyWork />}
        {currentPage === 'kanban' && <KanbanBoard />}
        {currentPage === 'activities' && <ActivitiesPage />}
        {currentPage === 'apps' && <AppsModule />}
        {currentPage === 'goals' && <GoalsModule />}
        {currentPage === 'tasks' && <TasksModule />}
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
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
