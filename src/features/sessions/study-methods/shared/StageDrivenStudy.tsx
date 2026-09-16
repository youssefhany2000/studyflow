import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { MethodBadge } from '@/shared/components/MethodBadge';
import type { StudyMethod } from '@shared/types';

import { 
  addSessionStage, 
  finishSession, 
  startSession, 
  selectActiveSession, 
  setActiveSession, 
  clearActiveSession 
} from '../../sessionsSlice';
import { SessionSummaryForm, type SessionSummaryData } from './SessionSummaryForm';
import { StageFlow, type StageDef, type StageResult } from './StageFlow';
import { SubjectPicker } from './SubjectPicker';

type Phase = 'setup' | 'starting' | 'active' | 'summary' | 'saving';

export function StageDrivenStudy({ method, label, stages }: { method: StudyMethod; label: string; stages: StageDef[] }) {
  const dispatch = useAppDispatch();
  const activeSession = useAppSelector(selectActiveSession);
  
  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  // Resume background session if one exists for this method
  useEffect(() => {
    if (activeSession && activeSession.method === method) {
      setSessionId(activeSession.id);
      setStartedAt(activeSession.startedAt);
      setPhase(activeSession.phase as Phase);
    }
  }, [activeSession, method]);

  async function handleStart(subjectId: number) {
    setPhase('starting');
    const startTime = Date.now();
    const session = await dispatch(
      startSession({ subject_id: subjectId, method, started_at: new Date(startTime).toISOString() }),
    ).unwrap();
    
    setSessionId(session.id);
    setStartedAt(startTime);
    setPhase('active');

    // Save to global background memory
    dispatch(setActiveSession({ 
      id: session.id, 
      method, 
      startedAt: startTime, 
      subjectId, 
      phase: 'active' 
    }));
  }

  async function handleStagesComplete(results: StageResult[]) {
    if (!sessionId) return;
    await Promise.all(
      results.map((r, i) =>
        dispatch(addSessionStage({ sessionId, stage_name: r.stage_name, stage_order: i + 1, content: r.content })),
      ),
    );
    
    setPhase('summary');
    if (activeSession) {
      dispatch(setActiveSession({ ...activeSession, phase: 'summary' }));
    }
  }

  async function handleFinish(data: SessionSummaryData) {
    if (!sessionId || !startedAt) return;
    setPhase('saving');
    
    const rawSeconds = Math.round((Date.now() - startedAt) / 1000);
    const guaranteedSeconds = Math.max(60, rawSeconds);

    await dispatch(
      finishSession({
        id: sessionId,
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: guaranteedSeconds,
        ...data,
      }),
    );

    // Clear global background memory once saved
    dispatch(clearActiveSession());
    setPhase('setup');
  }

  if (phase === 'setup' || phase === 'starting') {
    return (
      <div className="space-y-6 p-10">
        <h1 className="flex items-center gap-3 text-2xl font-display">
          {label} <MethodBadge method={method} />
        </h1>
        <SubjectPicker onSelect={handleStart} />
        {phase === 'starting' && <p className="text-sm text-muted-foreground">Starting…</p>}
      </div>
    );
  }

  if (phase === 'summary' || phase === 'saving') {
    const durationSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    return (
      <div className="p-10">
        <SessionSummaryForm durationSeconds={durationSeconds} onFinish={handleFinish} />
        {phase === 'saving' && <p className="mt-3 text-sm text-muted-foreground">Saving…</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-10">
      <h1 className="flex items-center gap-3 text-2xl font-display">
        {label} <MethodBadge method={method} />
      </h1>
      <StageFlow stages={stages} onComplete={handleStagesComplete} />
    </div>
  );
}