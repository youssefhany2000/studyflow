import { useEffect, useRef, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { MethodBadge } from '@/shared/components/MethodBadge';
import { Button } from '@/shared/components/ui/button';
import { MethodExplanation } from '@/shared/components/MethodExplanation';

import { 
  addPomodoroCycle, 
  finishSession, 
  startSession,
  selectActiveSession,
  setActiveSession,
  clearActiveSession
} from '../../sessionsSlice';
import { SessionSummaryForm, type SessionSummaryData } from '../shared/SessionSummaryForm';
import { SubjectPicker } from '../shared/SubjectPicker';

import bellSound from '@/assets/bell.mp3';

const SETTINGS = { work_minutes: 25, short_break_minutes: 5 };

type Phase = 'setup' | 'starting' | 'work' | 'break' | 'summary' | 'saving';

export default function PomodoroStudy() {
  const dispatch = useAppDispatch();
  const activeSession = useAppSelector(selectActiveSession);

  // Core State
  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  
  // Pomodoro Specific State
  const [cycleNumber, setCycleNumber] = useState(1);
  const [targetEndTime, setTargetEndTime] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(SETTINGS.work_minutes * 60);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // User Configurable Settings
  const [targetCycles, setTargetCycles] = useState(4);
  const [longBreakMins, setLongBreakMins] = useState(20);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const playChime = () => {
    const audio = new Audio(bellSound);
    audio.play().catch((e) => console.error('Failed to play sound:', e));
  };

  // 1. BULLETPROOF RECOVERY HOOK (Runs only on mount)
  useEffect(() => {
    const backup = localStorage.getItem('pomodoro_backup');
    
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        // If a backup exists, ALWAYS restore it. This survives tab switching and hard refreshes.
        if (parsed.sessionId && parsed.phase !== 'setup') {
          setSessionId(parsed.sessionId);
          setCycleNumber(parsed.cycleNumber || 1);
          setTargetEndTime(parsed.targetEndTime || 0);
          setPhase(parsed.phase as Phase);
          if (parsed.targetCycles) setTargetCycles(parsed.targetCycles);
          if (parsed.longBreakMins) setLongBreakMins(parsed.longBreakMins);
          if (parsed.sessionStartTime) setSessionStartTime(parsed.sessionStartTime);
          if (parsed.selectedSubjectId) setSelectedSubjectId(parsed.selectedSubjectId);

          // FIX: Calculate and set the remaining seconds IMMEDIATELY to prevent the 25:00 flash
          if (parsed.targetEndTime) {
            const remainingSeconds = Math.ceil((parsed.targetEndTime - Date.now()) / 1000);
            setSecondsLeft(Math.max(0, remainingSeconds));
          }

          // Re-hydrate Redux just in case it was wiped during navigation
          dispatch(setActiveSession({
            id: parsed.sessionId,
            method: 'pomodoro',
            startedAt: parsed.sessionStartTime || Date.now(),
            subjectId: parsed.selectedSubjectId || 0,
            phase: parsed.phase
          }));
          return;
        }
      } catch (e) {
        console.error("Failed to parse Pomodoro backup");
      }
    }

    // 2. Fallback to Redux if no local storage backup exists
    if (activeSession && activeSession.method === 'pomodoro') {
      setSessionId(activeSession.id);
      setSessionStartTime(activeSession.startedAt);
      setPhase(activeSession.phase as Phase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // 3. BULLETPROOF SAVE HOOK
  useEffect(() => {
    if (sessionId && phase !== 'setup' && phase !== 'starting') {
      localStorage.setItem('pomodoro_backup', JSON.stringify({
        sessionId, 
        cycleNumber, 
        targetEndTime, 
        phase, 
        targetCycles, 
        longBreakMins,
        sessionStartTime,
        selectedSubjectId
      }));
    }
  }, [sessionId, cycleNumber, targetEndTime, phase, targetCycles, longBreakMins, sessionStartTime, selectedSubjectId]);

  // 4. Timer Interval Hook
  useEffect(() => {
    if (phase !== 'work' && phase !== 'break') return undefined;

    const interval = window.setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((targetEndTime - now) / 1000);

      if (remaining > 0) {
        setSecondsLeft(remaining);
      } else {
        playChime();

        if (phaseRef.current === 'work') {
          if (sessionId) {
            dispatch(addPomodoroCycle({ sessionId, cycle_number: cycleNumber, type: 'work', planned_minutes: SETTINGS.work_minutes }));
          }
          const isLongBreak = cycleNumber % targetCycles === 0;
          const breakSeconds = (isLongBreak ? longBreakMins : SETTINGS.short_break_minutes) * 60;
          
          setPhase('break');
          setTargetEndTime(Date.now() + breakSeconds * 1000);
          setSecondsLeft(breakSeconds);
        } else {
          setCycleNumber((c) => c + 1);
          setPhase('work');
          setTargetEndTime(Date.now() + SETTINGS.work_minutes * 60 * 1000);
          setSecondsLeft(SETTINGS.work_minutes * 60);
        }
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, cycleNumber, sessionId, targetEndTime, targetCycles, longBreakMins, dispatch]);

  async function handleStart(subjectId: number) {
    setPhase('starting');
    setSelectedSubjectId(subjectId);
    
    const startTime = Date.now();
    const session = await dispatch(
      startSession({ subject_id: subjectId, method: 'pomodoro', started_at: new Date(startTime).toISOString() }),
    ).unwrap();
    
    const initialTarget = startTime + (SETTINGS.work_minutes * 60 * 1000);
    
    setSessionId(session.id);
    setSessionStartTime(startTime);
    setTargetEndTime(initialTarget);
    setPhase('work');

    dispatch(setActiveSession({ 
      id: session.id, 
      method: 'pomodoro', 
      startedAt: startTime, 
      subjectId, 
      phase: 'work' 
    }));
  }

  async function handleFinish(data: SessionSummaryData) {
    if (!sessionId) return;
    setPhase('saving');
    
    const rawSeconds = sessionStartTime > 0 
      ? Math.round((Date.now() - sessionStartTime) / 1000) 
      : (cycleNumber - 1) * SETTINGS.work_minutes * 60; 
      
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
    
    dispatch(clearActiveSession());
    localStorage.removeItem('pomodoro_backup');
    setSessionId(null);
    setSelectedSubjectId(null);
    setCycleNumber(1);
    setPhase('setup');
  }

  if (phase === 'setup' || phase === 'starting') {
    return (
      <div className="space-y-8 p-10">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-display mb-2">
            Pomodoro <MethodBadge method="pomodoro" />
          </h1>
          
          <MethodExplanation 
            title="How Pomodoro Works"
            description="Work in highly focused 25-minute sprints, followed by short mandatory breaks. This rhythm prevents cognitive fatigue and keeps your brain fresh over long study sessions."
            mechanics={[
              { action: "Focus Sprint", result: "Work uninterrupted for 25 minutes. The timer tracks your cycles automatically." },
              { action: "Short Break", result: "Take a 5-minute break to step away from the screen and rest." },
              { action: "Long Break", result: "After completing your target cycles, take a longer, customizable break to fully recharge." }
            ]}
            bestFor="Beating procrastination, chipping away at tedious tasks, or getting started when you feel unmotivated."
          />

          <p className="mt-4 text-sm font-medium text-muted-foreground uppercase tracking-wider">Configure your session:</p>
        </div>

        {/* Configuration Options */}
        <div className="space-y-6 rounded-lg border border-border p-6 shadow-sm bg-card">
          <div className="space-y-3">
            <label className="text-sm font-medium">Cycles before long break</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={targetCycles === num ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setTargetCycles(num)}
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Long break duration (mins)</label>
            <div className="flex gap-2">
              {[15, 20, 25, 30].map((mins) => (
                <Button
                  key={mins}
                  type="button"
                  variant={longBreakMins === mins ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setLongBreakMins(mins)}
                >
                  {mins}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <SubjectPicker onSelect={handleStart} />
        {phase === 'starting' && <p className="text-center text-sm text-muted-foreground">Starting…</p>}
      </div>
    );
  }

  if (phase === 'summary' || phase === 'saving') {
    const rawSeconds = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;
    return (
      <div className="p-10">
        <SessionSummaryForm durationSeconds={rawSeconds} onFinish={handleFinish} />
        {phase === 'saving' && <p className="mt-3 text-center text-sm text-muted-foreground">Saving…</p>}
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-10">
      <p className="text-sm uppercase tracking-wide text-muted-foreground">
        {phase === 'work' ? `Focus · Cycle ${cycleNumber}` : 'Break'}
      </p>
      <p className="font-mono text-7xl tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </p>
      <Button variant="outline" onClick={() => setPhase('summary')}>
        End session
      </Button>
    </div>
  );
}