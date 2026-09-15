import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  type: 'task_due' | 'task_start' | 'goal_start' | 'goal_end' | 'phase_start' | 'phase_end' | 'sprint_start' | 'sprint_end';
  color: string;
  projectName?: string;
};

const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  task_due: '#2383E2',
  task_start: '#2383E2',
  goal_start: '#2383E2',
  goal_end: '#2383E2',
  phase_start: '#2383E2',
  phase_end: '#2383E2',
  sprint_start: '#2383E2',
  sprint_end: '#2383E2'
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DRAGGABLE_TYPES = new Set<string>(['task_due', 'goal_end', 'phase_end', 'sprint_end']);

function isDraggableType(type: string) {
  return DRAGGABLE_TYPES.has(type);
}

export function CalendarPage() {
  const { apps, goals, tasks, phases, sprints, updateTask, updateGoal, updatePhase, updateSprint } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const events = useMemo<CalendarEvent[]>(() => {
    const evts: CalendarEvent[] = [];
    tasks.forEach(t => {
      const app = apps.find(a => a.id === t.appId);
      if (t.startDate) evts.push({ id: `ts-${t.id}`, title: t.name, date: t.startDate, type: 'task_start', color: EVENT_COLORS.task_start, projectName: app?.name });
      if (t.dueDate) evts.push({ id: `td-${t.id}`, title: t.name, date: t.dueDate, type: 'task_due', color: EVENT_COLORS.task_due, projectName: app?.name });
    });
    goals.forEach(g => {
      const app = apps.find(a => a.id === g.appId);
      if (g.startDate) evts.push({ id: `gs-${g.id}`, title: g.name, date: g.startDate, type: 'goal_start', color: EVENT_COLORS.goal_start, projectName: app?.name });
      if (g.endDate) evts.push({ id: `ge-${g.id}`, title: g.name, date: g.endDate, type: 'goal_end', color: EVENT_COLORS.goal_end, projectName: app?.name });
    });
    phases.forEach(p => {
      const app = apps.find(a => a.id === p.appId);
      if (p.startDate) evts.push({ id: `ps-${p.id}`, title: p.name, date: p.startDate, type: 'phase_start', color: EVENT_COLORS.phase_start, projectName: app?.name });
      if (p.endDate) evts.push({ id: `pe-${p.id}`, title: p.name, date: p.endDate, type: 'phase_end', color: EVENT_COLORS.phase_end, projectName: app?.name });
    });
    sprints.forEach(s => {
      const app = apps.find(a => a.id === s.appId);
      if (s.startDate) evts.push({ id: `ss-${s.id}`, title: s.name, date: s.startDate, type: 'sprint_start', color: EVENT_COLORS.sprint_start, projectName: app?.name });
      if (s.endDate) evts.push({ id: `se-${s.id}`, title: s.name, date: s.endDate, type: 'sprint_end', color: EVENT_COLORS.sprint_end, projectName: app?.name });
    });
    return evts;
  }, [tasks, goals, phases, sprints, apps]);

  const eventsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return events.filter(e => isSameDay(e.date, date));
  };

  const selectedEvents = selectedDay ? events.filter(e => isSameDay(e.date, selectedDay)) : [];
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDragStart = (e: React.DragEvent, evt: CalendarEvent) => {
    if (!isDraggableType(evt.type)) {
      e.preventDefault();
      return;
    }
    setDraggedId(evt.id);
    const payload = JSON.stringify({ sourceId: evt.id, sourceType: evt.type, originalDateISO: evt.date.toISOString() });
    try {
      e.dataTransfer.setData('application/json', payload);
      e.dataTransfer.setData('text/plain', payload);
    } catch {}
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverDay(null);
  };

  const handleDragOver = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDay !== day) setDragOverDay(day);
  };

  const handleDragLeave = (day: number) => {
    setDragOverDay(prev => (prev === day ? null : prev));
  };

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
    setDragOverDay(null);
    setDraggedId(null);
    if (!raw) return;
    let parsed: { sourceId: string; sourceType: string; originalDateISO: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    const { sourceId, sourceType, originalDateISO } = parsed;
    if (!sourceId || !sourceType) return;
    const newDate = new Date(year, month, day, 12, 0, 0, 0);
    if (originalDateISO) {
      const orig = new Date(originalDateISO);
      if (isSameDay(orig, newDate)) return;
    }
    const realId = sourceId.split('-').slice(1).join('-');
    if (sourceType === 'task_due') {
      updateTask(realId, { dueDate: newDate });
    } else if (sourceType === 'goal_end') {
      updateGoal(realId, { endDate: newDate });
    } else if (sourceType === 'phase_end') {
      updatePhase(realId, { endDate: newDate });
    } else if (sourceType === 'sprint_end') {
      updateSprint(realId, { endDate: newDate });
    }
  };

  return (
    <div className="bg-[#FFFFFF] max-w-[900px] mx-auto p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[24px] font-semibold text-[#37352F] leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>Calendar</h1>
          <p className="text-sm text-[#787774] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>Cross-project timeline view</p>
        </div>
        <div className="flex items-center gap-1 bg-[#E9E9E7] rounded-md p-1">
          <button onClick={prevMonth} className="p-1.5 rounded-[6px] hover:bg-[#FFFFFF] transition-colors duration-150 cursor-pointer">
            <ChevronLeft className="w-4 h-4 text-[#37352F]" />
          </button>
          <span className="text-sm font-medium text-[#37352F] min-w-[160px] text-center" style={{ fontFamily: 'Inter, sans-serif' }}>{MONTH_NAMES[month]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-[6px] hover:bg-[#FFFFFF] transition-colors duration-150 cursor-pointer">
            <ChevronRight className="w-4 h-4 text-[#37352F]" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E9E9E7] rounded-lg overflow-hidden">
        <div className="grid grid-cols-7">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-medium text-[#787774] uppercase tracking-wide border-b border-[#E9E9E7] bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white min-h-[96px] border-r border-b border-[#E9E9E7] last:border-r-0" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = eventsForDay(day);
            const isToday = isSameDay(new Date(year, month, day), new Date());
            const isSelected = selectedDay && isSameDay(selectedDay, new Date(year, month, day));
            const isDragOver = dragOverDay === day;
            return (
              <div
                key={day}
                onClick={() => setSelectedDay(new Date(year, month, day))}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={() => handleDragLeave(day)}
                onDrop={(e) => handleDrop(e, day)}
                className={`bg-white min-h-[96px] p-2 cursor-pointer border-r border-b border-[#E9E9E7] transition-colors duration-150 ${isDragOver ? 'ring-1 ring-inset ring-[#2383E2] bg-[#F7F7F5]' : ''} ${!isDragOver && isSelected ? 'ring-1 ring-inset ring-[#2383E2] bg-[#F7F7F5]' : ''} ${!isDragOver && !isSelected ? 'hover:bg-[#F7F7F5]' : ''}`}
              >
                <div className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-md mb-1 ${isToday ? 'bg-[#E9E9E7] text-[#37352F]' : 'text-[#37352F]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>{day}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(evt => {
                    const draggable = isDraggableType(evt.type);
                    const isDragging = draggedId === evt.id;
                    return (
                      <div
                        key={evt.id}
                        draggable={draggable}
                        onDragStart={(e) => handleDragStart(e, evt)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => { if (draggable) e.stopPropagation(); }}
                        className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded truncate bg-[#E8F0FE] text-[#2383E2] border border-[#E9E9E7] transition-colors duration-150 ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2383E2] flex-shrink-0" />
                        <span className="truncate">{evt.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && <div className="text-[11px] text-[#787774] px-1" style={{ fontFamily: 'Inter, sans-serif' }}>+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="mt-6 bg-white border border-[#E9E9E7] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#37352F] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>{selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(evt => {
                const draggable = isDraggableType(evt.type);
                const isDragging = draggedId === evt.id;
                return (
                  <div
                    key={evt.id}
                    draggable={draggable}
                    onDragStart={(e) => handleDragStart(e, evt)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 bg-white border border-[#E9E9E7] rounded-lg hover:bg-[#F7F7F5] transition-colors duration-150 ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#2383E2]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#37352F] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>{evt.title}</p>
                      <p className="text-xs text-[#787774] capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>{evt.type.replace(/_/g, ' ')}{evt.projectName ? ` · ${evt.projectName}` : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        {Object.entries(EVENT_COLORS).slice(0, 4).map(([type]) => (
          <div key={type} className="flex items-center gap-2 text-xs text-[#787774]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="w-2 h-2 rounded-full bg-[#2383E2]" />
            {type.replace(/_/g, ' ')}
          </div>
        ))}
      </div>
    </div>
  );
}
