import React, { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Task, TaskStatus } from '../types';
import { Clock, AlertCircle, CheckCircle, Star, User } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';

const COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'not_started', title: 'Not Started', color: '#6b6b80' },
  { id: 'in_progress', title: 'In Progress', color: '#00e5ff' },
  { id: 'blocked', title: 'Blocked', color: '#ff3b5c' },
  { id: 'completed', title: 'Completed', color: '#8b5cf6' },
  { id: 'approved', title: 'Approved', color: '#10b981' }
];

export function KanbanBoard() {
  return (
    <DndProvider backend={HTML5Backend}>
      <KanbanContent />
    </DndProvider>
  );
}

function KanbanContent() {
  const { currentUser, hasPermission } = useAuth();
  const { tasks, updateTask, getTasksForEmployee, getEmployeeById, getGoalById } = useApp();

  const canViewAll = hasPermission('view_all_apps');
  const displayTasks = canViewAll ? tasks : getTasksForEmployee(currentUser!.id);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    updateTask(taskId, { status: newStatus });
  };

  const handleCardClick = (task: Task) => {
    setSelectedTask(task);
  };

  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#f0f0f5] mb-2">Kanban Board</h1>
        <p className="text-[#6b6b80]">Drag tasks to update their status or click to view details</p>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const columnTasks = displayTasks.filter(task => task.status === column.id);

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              onDrop={handleDrop}
              onCardClick={handleCardClick}
              getEmployeeById={getEmployeeById}
              getGoalById={getGoalById}
            />
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

type KanbanColumnProps = {
  column: { id: TaskStatus; title: string; color: string };
  tasks: Task[];
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  onCardClick: (task: Task) => void;
  getEmployeeById: (id: string) => any;
  getGoalById: (id: string) => any;
};

function KanbanColumn({ column, tasks, onDrop, onCardClick, getEmployeeById, getGoalById }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { taskId: string }) => {
      onDrop(item.taskId, column.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <div
      ref={drop}
      className={`flex-shrink-0 w-80 bg-[#12121a] border-2 border-dashed transition ${
        isOver ? 'border-[#00e5ff] bg-[rgba(0,229,255,0.05)]' : 'border-[rgba(0,229,255,0.1)]'
      }`}
    >
      <div className="p-4 border-b border-[rgba(0,229,255,0.1)]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#f0f0f5]">{column.title}</h3>
          <span className="bg-[#1a1a2e] text-[#f0f0f5] text-xs font-medium px-2 py-1">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={onCardClick}
            getEmployeeById={getEmployeeById}
            getGoalById={getGoalById}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[#6b6b80]">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

type TaskCardProps = {
  task: Task;
  onClick: (task: Task) => void;
  getEmployeeById: (id: string) => any;
  getGoalById: (id: string) => any;
};

function TaskCard({ task, onClick, getEmployeeById, getGoalById }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { taskId: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(task);
  };

  const assignee = getEmployeeById(task.assignedTo);
  const goal = getGoalById(task.goalId);

  const priorityColors = {
    low: 'bg-[rgba(107,107,128,0.1)] text-[#6b6b80]',
    medium: 'bg-[rgba(0,229,255,0.1)] text-[#00e5ff]',
    high: 'bg-[rgba(245,158,11,0.1)] text-[#f59e0b]',
    urgent: 'bg-[rgba(255,59,92,0.1)] text-[#ff3b5c]'
  };

  return (
    <div
      ref={drag}
      onClick={handleClick}
      className={`bg-[#1a1a2e] border border-[rgba(0,229,255,0.1)] p-4 cursor-pointer hover:border-[rgba(0,229,255,0.3)] hover:shadow-md transition ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-[#f0f0f5] text-sm line-clamp-2">{task.name}</h4>
        {task.priority === 'urgent' && <Star className="w-4 h-4 text-[#ff3b5c] fill-[#ff3b5c]" />}
      </div>

      <p className="text-xs text-[#6b6b80] mb-3 line-clamp-2">{task.description}</p>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium px-2 py-1 ${
            priorityColors[task.priority]
          }`}
        >
          {task.priority.toUpperCase()}
        </span>

        {assignee && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-[#6b6b80]" />
            <span className="text-xs text-[#6b6b80]">{assignee.name.split(' ')[0]}</span>
          </div>
        )}
      </div>

      {goal && (
        <div className="mt-3 pt-3 border-t border-[rgba(0,229,255,0.1)]">
          <p className="text-xs text-[#6b6b80]">
            {goal.name}
          </p>
        </div>
      )}
    </div>
  );
}
