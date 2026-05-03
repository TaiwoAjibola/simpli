import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { LoginPage } from './components/LoginPage';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { KanbanBoard } from './components/KanbanBoard';
import { MyWork } from './components/MyWork';
import { AdminPanel } from './components/AdminPanel';
import { AppsModule } from './components/AppsModule';
import { GoalsModule, MilestonesModule } from './components/GoalsMilestonesModule';
import { TasksModule } from './components/TasksModule';
import { ActivitiesPage } from './components/ActivitiesPage';

function AppContent() {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

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
        {currentPage === 'milestones' && <MilestonesModule />}
        {currentPage === 'tasks' && <TasksModule />}
        {currentPage === 'admin' && <AdminPanel />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
