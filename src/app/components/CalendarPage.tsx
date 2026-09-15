import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Target,
  CheckSquare,
  Rocket,
  Clock
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
  task_due: '#7C3AED',
  task_start: '#7C3AED',
  goal_start: '#8b5cf6',
  goal_end: '#8b5cf6',
  phase_start: '#3b82f6',
  phase_end: '#3b82f6',
  sprint_start: '#f59e0b',
  sprint_end: '#f59e0b'
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

export function CalendarPage() {
  const { apps, goals, tasks, phases, sprints } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-foreground mt-1">Cross-project timeline view</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded"><ChevronLeft className="w-5 h-5 text-foreground" /></button>
          <span className="text-lg font-semibold text-foreground min-w-[180px] text-center">{MONTH_NAMES[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded"><ChevronRight className="w-5 h-5 text-foreground" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-[rgba(124,58,237,0.08)]">
        {DAY_NAMES.map(d => (
          <div key={d} className="bg-white p-2 text-center text-xs font-semibold text-foreground uppercase">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-[#FAF5FF] min-h-[100px]" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayEvents = eventsForDay(day);
          const isToday = isSameDay(new Date(year, month, day), new Date());
          const isSelected = selectedDay && isSameDay(selectedDay, new Date(year, month, day));
          return (
            <div
              key={day}
              onClick={() => setSelectedDay(new Date(year, month, day))}
              className={`bg-white min-h-[100px] p-2 cursor-pointer hover:bg-[rgba(124,58,237,0.03)] transition-colors ${isSelected ? 'ring-1 ring-[#7C3AED]' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${isToday ? 'text-[#7C3AED]' : 'text-foreground'}`}>{day}</div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(evt => (
                  <div key={evt.id} className="text-[10px] px-1 py-0.5 truncate rounded" style={{ backgroundColor: `${evt.color}20`, color: evt.color }}>
                    {evt.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="text-[9px] text-foreground">+{dayEvents.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-6 p-6 bg-white border border-[#E9D5FF]">
          <h3 className="text-lg font-semibold text-foreground mb-3">{selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-foreground">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(evt => (
                <div key={evt.id} className="flex items-center gap-3 p-3 bg-[#F5F3FF] border border-[#E9D5FF]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: evt.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{evt.title}</p>
                    <p className="text-xs text-foreground">{evt.type.replace(/_/g, ' ')}{evt.projectName ? ` · ${evt.projectName}` : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        {Object.entries(EVENT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-xs text-foreground">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {type.replace(/_/g, ' ')}
          </div>
        ))}
      </div>
    </div>
  );
}
