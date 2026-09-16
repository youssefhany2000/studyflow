import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Trash2 } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Card, CardContent } from '@/shared/components/ui/card';
import { MethodBadge } from '@/shared/components/MethodBadge';
import { Button } from '@/shared/components/ui/button';
import { STUDY_METHODS } from '@/lib/constants';
import { formatDuration } from '@/lib/format';
import type { StudyMethod } from '@shared/types';

import { deleteSession, fetchSessions, selectSessions, selectSessionsStatus } from './sessionsSlice';
import { fetchSubjects, selectSubjects, selectSubjectsStatus } from '../subjects/subjectsSlice';

export default function SessionsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const [methodFilter, setMethodFilter] = useState<StudyMethod | 'all'>('all');
  const [sessionToDelete, setSessionToDelete] = useState<number | null>(null);

  const allSessions = useAppSelector(selectSessions);
  const sessionsStatus = useAppSelector(selectSessionsStatus);
  const subjects = useAppSelector(selectSubjects);
  const subjectsStatus = useAppSelector(selectSubjectsStatus);

  useEffect(() => {
    if (sessionsStatus === 'idle') dispatch(fetchSessions());
    if (subjectsStatus === 'idle') dispatch(fetchSubjects());
  }, [sessionsStatus, subjectsStatus, dispatch]);

  const subjectLookup = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const sessions = useMemo(
    () => (methodFilter === 'all' ? allSessions : allSessions.filter((s) => s.method === methodFilter)),
    [allSessions, methodFilter],
  );

  function confirmDelete() {
    if (sessionToDelete !== null) {
      dispatch(deleteSession(sessionToDelete));
      setSessionToDelete(null);
    }
  }

  return (
    <div className="space-y-6 p-10 relative">
      <h1 className="text-2xl font-display">Session History</h1>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={methodFilter === 'all'} onClick={() => setMethodFilter('all')}>
          All
        </FilterChip>
        {(Object.keys(STUDY_METHODS) as StudyMethod[]).map((method) => (
          <FilterChip key={method} active={methodFilter === method} onClick={() => setMethodFilter(method)}>
            {STUDY_METHODS[method].label}
          </FilterChip>
        ))}
      </div>

      {sessionsStatus === 'loading' && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-2">
        {sessions.map((session) => {
          const subject = subjectLookup[session.subject_id];
          return (
            <Card 
              key={session.id}
              onClick={() => navigate(`/sessions/${session.id}`)}
              className="border-l-4 transition-colors hover:bg-muted/50 cursor-pointer" 
              style={{ borderLeftColor: subject?.color }}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{subject?.name ?? 'Unknown subject'}</span>
                  <MethodBadge method={session.method} />
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{new Date(session.started_at).toLocaleDateString()}</span>
                  <span>{formatDuration(session.duration_seconds)}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete(session.id);
                    }}
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors ml-2"
                    title="Delete Session"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {sessionsStatus === 'succeeded' && sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">No sessions match this filter.</p>
        )}
      </div>

      {/* delete confirmation modal */}
      {sessionToDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Delete Session</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this session? It will be permanently removed from your analytics.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSessionToDelete(null)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmDelete}
                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'
      }`}
    >
      {children}
    </button>
  );
}