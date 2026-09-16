import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/shared/components/ui/button';
import { formatLocalDate } from '@/lib/date';
import type { StudyMethod } from '@shared/types';

import { fetchPlannedSessions, selectPlannedSessions } from '@/features/planner/plannerSlice';
import { fetchSessions, selectSessions } from '@/features/sessions/sessionsSlice';
import { fetchSubjects, selectSubjects } from '@/features/subjects/subjectsSlice';

interface CalendarEntry {
  id: string;
  subjectName: string;
  subjectColor: string;
  method: StudyMethod;
  kind: 'planned' | 'completed';
}

const DAY_LABELS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function CalendarPage() {
  const dispatch = useAppDispatch();
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const plannedSessions = useAppSelector(selectPlannedSessions);
  const sessions = useAppSelector(selectSessions);
  const subjects = useAppSelector(selectSubjects);

  const days = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    
    const dayOfWeek = firstDayOfMonth.getDay();
    const offset = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
    
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(firstDayOfMonth.getDate() - offset);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [currentMonth]);

  useEffect(() => {
    dispatch(fetchPlannedSessions({ from: formatLocalDate(days[0]), to: formatLocalDate(days[days.length - 1]) }));
    dispatch(fetchSessions());
    dispatch(fetchSubjects());
  }, [days, dispatch]);

  const subjectLookup = useMemo(() => {
    const safeSubjects = subjects || [];
    return Object.fromEntries(safeSubjects.map((s) => [s.id, s]));
  }, [subjects]);

  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    const safePlanned = plannedSessions || [];
    const safeSessions = sessions || [];

    for (const p of safePlanned) {
      const subject = subjectLookup[p.subject_id];
      const entry: CalendarEntry = {
        id: `planned-${p.id}`,
        subjectName: subject?.name ?? 'Unknown',
        subjectColor: subject?.color ?? '#888888', 
        method: p.method,
        kind: 'planned',
      };
      (map[p.planned_date] ??= []).push(entry);
    }
    
    for (const s of safeSessions) {
      const dateKey = formatLocalDate(new Date(s.started_at));
      const subject = subjectLookup[s.subject_id];
      const entry: CalendarEntry = {
        id: `session-${s.id}`,
        subjectName: subject?.name ?? 'Unknown',
        subjectColor: subject?.color ?? '#888888', 
        method: s.method,
        kind: 'completed',
      };
      (map[dateKey] ??= []).push(entry);
    }
    return map;
  }, [plannedSessions, sessions, subjectLookup]);

  function shiftMonth(delta: number) {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + delta);
      return next;
    });
  }

  const todayKey = formatLocalDate(new Date());
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label) => (
          <div key={label} className="pb-2 text-center text-sm font-semibold text-muted-foreground">
            {label}
          </div>
        ))}
        
        {days.map((day) => {
          const key = formatLocalDate(day);
          const entries = entriesByDate[key] ?? [];
          const isToday = key === todayKey;
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          
          return (
            <div 
              key={key} 
              className={`min-h-24 rounded-md border p-2 ${isToday ? 'border-accent' : 'border-border'} ${!isCurrentMonth ? 'bg-muted/30 opacity-50' : ''}`}
            >
              <p className={`text-sm font-medium ${isToday ? 'text-accent' : ''}`}>{day.getDate()}</p>
              <div className="mt-2 space-y-1">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center rounded px-1.5 py-1 text-xs truncate ${
                      entry.kind === 'planned' ? 'border border-dashed border-border text-muted-foreground' : 'bg-muted text-foreground'
                    }`}
                    title={entry.subjectName}
                  >
                    {/* colored dot matching the subject */}
                    <span 
                      className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full" 
                      style={{ backgroundColor: entry.subjectColor }}
                    />
                    {entry.subjectName}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}