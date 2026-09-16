import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { MethodBadge } from '@/shared/components/MethodBadge';
import { Button } from '@/shared/components/ui/button';
import { MethodExplanation } from '@/shared/components/MethodExplanation';

import { 
  finishSession, 
  startSession,
  selectActiveSession,
  setActiveSession,
  clearActiveSession
} from '../../sessionsSlice';
import { SessionSummaryForm, type SessionSummaryData } from '../shared/SessionSummaryForm';
import { SubjectPicker } from '../shared/SubjectPicker';

import bellSound from '@/assets/bell.mp3';

type Phase = 'setup' | 'starting' | 'active' | 'break' | 'summary' | 'saving';

export default function FlowtimeStudy() {
  const dispatch = useAppDispatch();
  const activeSession = useAppSelector(selectActiveSession);

  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionId, setSessionId] = useState<number | null>(null);
  
  // Timer State
  const [totalFocusedSeconds, setTotalFocusedSeconds] = useState(0);
  const [currentFocusStart, setCurrentFocusStart] = useState<number>(0);
  const [breakTargetEndTime, setBreakTargetEndTime] = useState<number>(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);

  const playChime = () => {
    const audio = new Audio(bellSound);
    audio.play().catch((e) => console.error('Failed to play sound:', e));
  };

  // 1. Restore background session from Redux & LocalStorage
  useEffect(() => {
    if (activeSession && activeSession.method === 'flowtime') {
      const backup = localStorage.getItem('flowtime_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed.sessionId === activeSession.id) {
          setSessionId(parsed.sessionId);
          setPhase(parsed.phase as Phase);
          setTotalFocusedSeconds(parsed.totalFocusedSeconds);
          setCurrentFocusStart(parsed.currentFocusStart);
          setBreakTargetEndTime(parsed.breakTargetEndTime);
          return;
        }
      }
      
      // Fallback if localStorage is wiped
      setSessionId(activeSession.id);
      setCurrentFocusStart(activeSession.startedAt);
      setTotalFocusedSeconds(0);
      setPhase(activeSession.phase as Phase);
    }
  }, [activeSession]);

  // 2. Mirror critical state to LocalStorage for tab survival
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('flowtime_backup', JSON.stringify({
        sessionId, phase, totalFocusedSeconds, currentFocusStart, breakTargetEndTime
      }));
    }
  }, [sessionId, phase, totalFocusedSeconds, currentFocusStart, breakTargetEndTime]);

  // 3. Dual-mode Timer (Counts UP for focus, DOWN for breaks)
  useEffect(() => {
    if (phase !== 'active' && phase !== 'break') return undefined;
    
    // Initial paint calculation
    if (phase === 'active' && currentFocusStart > 0) {
      setDisplaySeconds(totalFocusedSeconds + Math.floor((Date.now() - currentFocusStart) / 1000));
    }

    const interval = window.setInterval(() => {
      const now = Date.now();
      
      if (phase === 'active' && currentFocusStart > 0) {
        const currentElapsed = Math.floor((now - currentFocusStart) / 1000);
        setDisplaySeconds(totalFocusedSeconds + currentElapsed);
      } 
      else if (phase === 'break' && breakTargetEndTime > 0) {
        const remaining = Math.ceil((breakTargetEndTime - now) / 1000);
        if (remaining > 0) {
          setDisplaySeconds(remaining);
        } else {
          playChime();
          setCurrentFocusStart(Date.now());
          setPhase('active');
        }
      }
    }, 1000);
    
    return () => window.clearInterval(interval);
  }, [phase, currentFocusStart, breakTargetEndTime, totalFocusedSeconds]);

  async function handleStart(subjectId: number) {
    setPhase('starting');
    const startTime = Date.now();
    const session = await dispatch(
      startSession({ subject_id: subjectId, method: 'flowtime', started_at: new Date(startTime).toISOString() }),
    ).unwrap();
    
    setSessionId(session.id);
    setCurrentFocusStart(startTime);
    setTotalFocusedSeconds(0);
    setPhase('active');

    dispatch(setActiveSession({ id: session.id, method: 'flowtime', startedAt: startTime, subjectId, phase: 'active' }));
  }

  function handleTakeBreak() {
    const now = Date.now();
    const sessionElapsed = Math.floor((now - currentFocusStart) / 1000);
    
    setTotalFocusedSeconds(prev => prev + sessionElapsed);
    
    // Calculate 20% of the LAST focus block
    const breakSeconds = Math.max(1, Math.ceil(sessionElapsed * 0.2));
    setBreakTargetEndTime(now + (breakSeconds * 1000));
    setDisplaySeconds(breakSeconds);
    setPhase('break');
  }

  function handleSkipBreak() {
    setCurrentFocusStart(Date.now());
    setPhase('active');
  }

  function handleEndSession() {
    if (phase === 'active') {
      const sessionElapsed = Math.floor((Date.now() - currentFocusStart) / 1000);
      setTotalFocusedSeconds(prev => prev + sessionElapsed);
    }
    setPhase('summary');
  }

  async function handleFinish(data: SessionSummaryData) {
    if (!sessionId) return;
    setPhase('saving');
    
    const guaranteedSeconds = Math.max(60, totalFocusedSeconds);

    await dispatch(
      finishSession({
        id: sessionId,
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: guaranteedSeconds,
        ...data,
      }),
    );
    
    dispatch(clearActiveSession());
    localStorage.removeItem('flowtime_backup');
    setSessionId(null);
    setCurrentFocusStart(0);
    setTotalFocusedSeconds(0);
    setPhase('setup');
  }

  if (phase === 'setup' || phase === 'starting') {
    return (
      <div className="space-y-6 p-10">
        <h1 className="flex items-center gap-3 text-2xl font-display mb-2">
          Flowtime <MethodBadge method="flowtime" />
        </h1>
        
        <MethodExplanation 
          title="How Flowtime Works"
          description="Unlike Pomodoro's rigid alarms, Flowtime respects your natural concentration limits. Start a stopwatch and work until you naturally lose focus, then take a proportional break."
          mechanics={[
            { action: "Focus", result: "Work for as long as you feel productive. The timer continuously counts up." },
            { action: "Take a Break", result: "The system automatically calculates a rest period equal to 20% of the focused time you just completed." }
          ]}
          bestFor="Backend programming, writing, or complex problem-solving where a random alarm would ruin your 'flow state'."
        />

        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-4">Pick a subject to begin:</p>
        <SubjectPicker onSelect={handleStart} />
        {phase === 'starting' && <p className="text-sm text-muted-foreground">Starting…</p>}
      </div>
    );
  }

  if (phase === 'summary' || phase === 'saving') {
    return (
      <div className="p-10">
        <SessionSummaryForm durationSeconds={totalFocusedSeconds} onFinish={handleFinish} />
        {phase === 'saving' && <p className="mt-3 text-sm text-muted-foreground">Saving…</p>}
      </div>
    );
  }

  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-10">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        {phase === 'active' ? 'Total Focused Time' : 'Resting'}
      </p>
      
      <p className="font-mono text-7xl tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </p>

      <div className="flex gap-4">
        {phase === 'active' ? (
          <Button variant="default" onClick={handleTakeBreak}>
            Take a Break
          </Button>
        ) : (
          <Button variant="default" onClick={handleSkipBreak}>
            Resume Focus
          </Button>
        )}
        
        <Button variant="outline" onClick={handleEndSession}>
          End session
        </Button>
      </div>
    </div>
  );
}