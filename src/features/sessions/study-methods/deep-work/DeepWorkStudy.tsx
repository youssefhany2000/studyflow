import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

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

const DEEP_WORK_MINUTES = 90;

const CHECKLIST_ITEMS = [
  "Phone is out of reach or on Do Not Disturb",
  "Water is filled and on the desk",
  "Bathroom break taken",
  "One single, clear goal is defined for this block"
];

type Phase = 'setup' | 'checklist' | 'starting' | 'active' | 'summary' | 'saving';

export default function DeepWorkStudy() {
  const dispatch = useAppDispatch();
  const activeSession = useAppSelector(selectActiveSession);

  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  
  const [checklist, setChecklist] = useState<boolean[]>(new Array(CHECKLIST_ITEMS.length).fill(false));
  const [targetEndTime, setTargetEndTime] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(DEEP_WORK_MINUTES * 60);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  const allChecked = checklist.every(Boolean);

  const playChime = () => {
    const audio = new Audio(bellSound);
    audio.play().catch((e) => console.error('Failed to play sound:', e));
  };

  useEffect(() => {
    if (activeSession && activeSession.method === 'deep_work') {
      const backup = localStorage.getItem('deep_work_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed.sessionId === activeSession.id) {
          setSessionId(parsed.sessionId);
          setPhase(parsed.phase as Phase);
          setTargetEndTime(parsed.targetEndTime);
          setSessionStartTime(parsed.sessionStartTime);
          return;
        }
      }
      
      setSessionId(activeSession.id);
      setSessionStartTime(activeSession.startedAt);
      setPhase(activeSession.phase as Phase);
    }
  }, [activeSession]);

  useEffect(() => {
    if (sessionId && targetEndTime > 0) {
      localStorage.setItem('deep_work_backup', JSON.stringify({
        sessionId, phase, targetEndTime, sessionStartTime
      }));
    }
  }, [sessionId, phase, targetEndTime, sessionStartTime]);

  useEffect(() => {
    if (phase !== 'active') return undefined;

    const interval = window.setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((targetEndTime - now) / 1000);

      if (remaining > 0) {
        setSecondsLeft(remaining);
      } else {
        playChime();
        setPhase('summary');
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, targetEndTime]);

  function handleSubjectSelect(subjectId: number) {
    setSelectedSubjectId(subjectId);
    setPhase('checklist');
  }

  function toggleChecklistItem(index: number) {
    setChecklist(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  async function handleStart() {
    if (!selectedSubjectId) return;
    setPhase('starting');
    
    const startTime = Date.now();
    const session = await dispatch(
      startSession({ subject_id: selectedSubjectId, method: 'deep_work', started_at: new Date(startTime).toISOString() }),
    ).unwrap();
    
    const initialTarget = startTime + (DEEP_WORK_MINUTES * 60 * 1000);
    
    setSessionId(session.id);
    setSessionStartTime(startTime);
    setTargetEndTime(initialTarget);
    setPhase('active');

    dispatch(setActiveSession({ 
      id: session.id, 
      method: 'deep_work', 
      startedAt: startTime, 
      subjectId: selectedSubjectId, 
      phase: 'active' 
    }));
  }

  async function handleFinish(data: SessionSummaryData) {
    if (!sessionId) return;
    setPhase('saving');
    
    const rawSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
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
    localStorage.removeItem('deep_work_backup');
    setSessionId(null);
    setChecklist(new Array(CHECKLIST_ITEMS.length).fill(false));
    setPhase('setup');
  }

  if (phase === 'setup' || phase === 'starting') {
    return (
      <div className="space-y-6 p-10">
        <h1 className="flex items-center gap-3 text-2xl font-display mb-2">
          Deep Work <MethodBadge method="deep_work" />
        </h1>
        
        <MethodExplanation 
          title="How Deep Work Works"
          description="Block out 90+ minutes of intense, zero-distraction focus. Before starting, you will complete a mandatory pre-flight checklist to ensure your environment is completely free of friction. Put your phone in another room, close all non-essential tabs, and dive completely into a single demanding task."
          bestFor="Building complex projects, grasping difficult algorithms, or heavy research."
        />

        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-4">Pick a subject to begin:</p>
        <SubjectPicker onSelect={handleSubjectSelect} />
      </div>
    );
  }

  if (phase === 'checklist') {
    return (
      <div className="mx-auto max-w-md space-y-6 p-10">
        <h1 className="text-2xl font-display">Pre-Flight Checklist</h1>
        <p className="text-sm text-muted-foreground">Deep work requires an environment totally free of friction. Confirm your setup:</p>
        
        <div className="space-y-3">
          {CHECKLIST_ITEMS.map((item, i) => (
            <div 
              key={i} 
              onClick={() => toggleChecklistItem(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 transition-all hover:bg-muted/50 ${
                checklist[i] ? 'border-primary/40 bg-primary/5' : 'border-border'
              }`}
            >
              <div 
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  checklist[i] 
                    ? 'border-primary bg-primary text-primary-foreground' 
                    : 'border-muted-foreground/50 text-transparent'
                }`}
              >
                <Check size={14} strokeWidth={4} />
              </div>
              
              <span className={`text-sm transition-colors ${checklist[i] ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {item}
              </span>
            </div>
          ))}
        </div>

        <Button 
          className="w-full"
          variant="outline"
          disabled={!allChecked} 
          onClick={handleStart}
        >
          {allChecked ? 'Enter Deep Work' : 'Complete checklist to start'}
        </Button>
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
      <p className="text-sm uppercase tracking-wide text-muted-foreground">Deep Focus</p>
      
      <p className="font-mono text-7xl tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </p>

      <div className="mt-4 flex gap-4">
        <Button variant="outline" onClick={() => setPhase('summary')}>
          End Early
        </Button>
      </div>
    </div>
  );
}