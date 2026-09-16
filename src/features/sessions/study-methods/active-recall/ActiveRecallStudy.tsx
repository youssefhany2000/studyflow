import { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { MethodBadge } from '@/shared/components/MethodBadge';
import { Button } from '@/shared/components/ui/button';
import { addWeakConcepts } from '@/features/srs/srsSlice';
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

type Phase = 'setup' | 'drafting' | 'starting' | 'active' | 'audit' | 'summary' | 'saving';
type Grade = 'pass' | 'partial' | 'fail' | null;
type AnswerMode = 'in-app' | 'external';

export default function ActiveRecallStudy() {
  const dispatch = useAppDispatch();
  const activeSession = useAppSelector(selectActiveSession);

  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  
  const [concepts, setConcepts] = useState<string[]>(['']);
  const [answers, setAnswers] = useState<string[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('in-app');
  
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);

  useEffect(() => {
    if (activeSession && activeSession.method === 'active_recall') {
      const backup = localStorage.getItem('active_recall_backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed.sessionId === activeSession.id) {
          setSessionId(parsed.sessionId);
          setPhase(parsed.phase as Phase);
          setConcepts(parsed.concepts || []);
          setAnswers(parsed.answers || []);
          setGrades(parsed.grades || []);
          setAnswerMode(parsed.answerMode || 'in-app');
          setSessionStartTime(parsed.sessionStartTime);
          setTotalSeconds(parsed.totalSeconds || 0);
          return;
        }
      }
      
      setSessionId(activeSession.id);
      setSessionStartTime(activeSession.startedAt);
      setPhase(activeSession.phase as Phase);
    }
  }, [activeSession]);

  useEffect(() => {
    if (sessionId && phase !== 'setup' && phase !== 'drafting') {
      localStorage.setItem('active_recall_backup', JSON.stringify({
        sessionId, phase, concepts, answers, grades, answerMode, sessionStartTime, totalSeconds
      }));
    }
  }, [sessionId, phase, concepts, answers, grades, answerMode, sessionStartTime, totalSeconds]);

  useEffect(() => {
    if (phase !== 'active') return undefined;

    setDisplaySeconds(Math.floor((Date.now() - sessionStartTime) / 1000));

    const interval = window.setInterval(() => {
      setDisplaySeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, sessionStartTime]);

  function handleSubjectSelect(subjectId: number) {
    setSelectedSubjectId(subjectId);
    setPhase('drafting');
  }

  function handleConceptChange(index: number, value: string) {
    const newConcepts = [...concepts];
    newConcepts[index] = value;
    setConcepts(newConcepts);
  }

  function handleAnswerChange(index: number, value: string) {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  }

  function addConcept() {
    setConcepts([...concepts, '']);
  }

  function removeConcept(index: number) {
    if (concepts.length === 1) {
      setConcepts(['']);
      return;
    }
    const newConcepts = [...concepts];
    newConcepts.splice(index, 1);
    setConcepts(newConcepts);
  }

  async function handleStartSession() {
    const cleanConcepts = concepts.filter(c => c.trim().length > 0);
    if (cleanConcepts.length === 0) return;
    if (!selectedSubjectId) return;

    setPhase('starting');
    setConcepts(cleanConcepts);
    setAnswers(new Array(cleanConcepts.length).fill(''));
    setGrades(new Array(cleanConcepts.length).fill(null));
    
    const startTime = Date.now();
    const session = await dispatch(
      startSession({ subject_id: selectedSubjectId, method: 'active_recall', started_at: new Date(startTime).toISOString() }),
    ).unwrap();
    
    setSessionId(session.id);
    setSessionStartTime(startTime);
    setPhase('active');

    dispatch(setActiveSession({ 
      id: session.id, 
      method: 'active_recall', 
      startedAt: startTime, 
      subjectId: selectedSubjectId, 
      phase: 'active' 
    }));
  }

  function handleEndActiveRecall() {
    setTotalSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    setPhase('audit');
  }

  function handleGrade(index: number, grade: Grade) {
    const newGrades = [...grades];
    newGrades[index] = grade;
    setGrades(newGrades);
  }

  const allGraded = grades.every(g => g !== null);

  async function handleFinish(data: SessionSummaryData) {
    if (!sessionId) return;
    setPhase('saving');
    
    const guaranteedSeconds = Math.max(60, totalSeconds);

    // SRS EXTRACTION LOGIC 
    if (selectedSubjectId) {
      const weakConceptsToSave = concepts
        .map((conceptText, i) => ({ text: conceptText, grade: grades[i] }))
        .filter(c => c.grade === 'fail' || c.grade === 'partial')
        .map(c => ({
          subject_id: selectedSubjectId,
          concept_text: c.text,
          initial_grade: c.grade as 'fail' | 'partial',
        }));

      if (weakConceptsToSave.length > 0) {
        // THE FIX: await the saving of concepts to SQLite before proceeding
        await dispatch(addWeakConcepts(weakConceptsToSave));
      }
    }

    const failedConcepts = concepts.filter((_, i) => grades[i] === 'fail');
    const partialConcepts = concepts.filter((_, i) => grades[i] === 'partial');

    const reportParts = [];
    
    if (failedConcepts.length > 0) {
      reportParts.push(`Failed: ${failedConcepts.join(', ')}`);
    }
    
    if (partialConcepts.length > 0) {
      reportParts.push(`Partial: ${partialConcepts.join(', ')}`);
    }

    const auditReport = reportParts.join('  |  ');

    let finalNotes = data.notes;
    if (auditReport) {
      finalNotes = data.notes 
        ? `Weak points: ${auditReport}  |  Notes: ${data.notes}` 
        : `Weak points: ${auditReport}`;
    }

    await dispatch(
      finishSession({
        id: sessionId,
        status: 'completed',
        ended_at: new Date().toISOString(),
        duration_seconds: guaranteedSeconds,
        ...data,
        notes: finalNotes
      }),
    );
    
    dispatch(clearActiveSession());
    localStorage.removeItem('active_recall_backup');
    setSessionId(null);
    setConcepts(['']);
    setAnswers([]);
    setGrades([]);
    setTotalSeconds(0);
    setPhase('setup');
  }

  if (phase === 'setup') {
    return (
      <div className="space-y-6 p-10 w-full h-full">
        <h1 className="flex items-center gap-3 text-2xl font-display">
          Active Recall <MethodBadge method="active_recall" />
        </h1>
        
        <MethodExplanation 
          title="How Active Recall Works"
          description="Don't just re-read your notes. Force your brain to retrieve the answer from memory. This strengthens the neural pathways and exposes what you don't actually know yet."
          mechanics={[
            { action: "Knew it", result: "Great! You mastered it. It stays out of the algorithm." },
            { action: "Needed a hint", result: "Sent to the Spaced Repetition engine. The algorithm schedules your first review for 3 days from now." },
            { action: "Blanked", result: "Sent to the Spaced Repetition engine. The algorithm schedules your first review for tomorrow to quickly rebuild the connection." }
          ]}
          bestFor="Memorizing exact definitions, formulas, and specific facts."
        />

        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pick a subject to begin:</p>
        <SubjectPicker onSelect={handleSubjectSelect} />
      </div>
    );
  }
  
  if (phase === 'drafting' || phase === 'starting') {
    return (
      <div className="flex h-full w-full flex-col items-center p-10">
        <div className="w-full max-w-4xl space-y-6">
          <h1 className="text-2xl font-display">Set Your Targets</h1>
          <p className="text-sm text-muted-foreground">
            What are you trying to retrieve from memory? List 3-5 core concepts, questions, or definitions.
          </p>

          <div className="space-y-3">
            {concepts.map((concept, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}.</span>
                <input
                  type="text"
                  value={concept}
                  onChange={(e) => handleConceptChange(i, e.target.value)}
                  placeholder={i === 0 ? "Concept or question..." : "Concept or question..."}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button variant="ghost" size="icon" onClick={() => removeConcept(i)}>
                  <Trash2 size={16} className="text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full border-dashed" onClick={addConcept}>
            <Plus size={16} className="mr-2" /> Add Concept
          </Button>

          <Button 
            className="w-full mt-8"
            disabled={!concepts.some(c => c.trim().length > 0) || phase === 'starting'}
            onClick={handleStartSession}
          >
            {phase === 'starting' ? 'Starting...' : 'Lock Screen & Start Timer'}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'active') {
    const minutes = Math.floor(displaySeconds / 60);
    const seconds = displaySeconds % 60;

    return (
      <div className="flex h-full w-full flex-col items-center gap-8 p-10 overflow-y-auto pb-24">
        <div className="w-full max-w-4xl flex flex-col items-center gap-8">
          <div className="text-center space-y-2 shrink-0 mt-8">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Retrieval Phase</p>
            <p className="font-mono text-7xl tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
          </div>

          <div className="flex gap-2 w-full justify-center">
            <Button 
              variant={answerMode === 'in-app' ? 'default' : 'outline'} 
              onClick={() => setAnswerMode('in-app')}
              size="sm"
            >
              Type Answers Here
            </Button>
            <Button 
              variant={answerMode === 'external' ? 'default' : 'outline'} 
              onClick={() => setAnswerMode('external')}
              size="sm"
            >
              Use My Notebook
            </Button>
          </div>

          <div className="w-full space-y-6">
            <p className="text-sm font-medium text-center text-muted-foreground">Recall the following concepts from memory:</p>
            {concepts.map((concept, i) => (
              <div key={i} className="space-y-3 bg-muted/30 p-5 rounded-lg border border-border">
                <div className="text-lg flex gap-3 font-medium">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{concept}</span>
                </div>
                {answerMode === 'in-app' && (
                  <textarea
                    value={answers[i]}
                    onChange={(e) => handleAnswerChange(i, e.target.value)}
                    placeholder="Type your answer from memory..."
                    className="flex min-h-24 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="lg" className="mt-4 shrink-0" onClick={handleEndActiveRecall}>
            I'm done retrieving
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'audit') {
    return (
      <div className="flex h-full w-full flex-col items-center p-10 pb-24 overflow-y-auto">
        <div className="w-full max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-display">The Audit</h1>
            <p className="text-sm text-muted-foreground">
              Open your notes and check your work. Be honest.
            </p>
          </div>

          <div className="space-y-6">
            {concepts.map((concept, i) => (
              <div key={i} className="flex flex-col gap-4 p-5 rounded-lg border border-border bg-card">
                <p className="font-medium text-lg">{concept}</p>
                
                {answerMode === 'in-app' && answers[i] && (
                  <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground whitespace-pre-wrap border border-border/50">
                    {answers[i]}
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button 
                    variant={grades[i] === 'pass' ? 'default' : 'outline'}
                    className={grades[i] === 'pass' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}
                    onClick={() => handleGrade(i, 'pass')}
                  >
                    <CheckCircle2 size={16} className="mr-2" /> Knew it
                  </Button>
                  <Button 
                    variant={grades[i] === 'partial' ? 'default' : 'outline'}
                    className={grades[i] === 'partial' ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600' : ''}
                    onClick={() => handleGrade(i, 'partial')}
                  >
                    <AlertCircle size={16} className="mr-2" /> Needed a hint
                  </Button>
                  <Button 
                    variant={grades[i] === 'fail' ? 'default' : 'outline'}
                    className={grades[i] === 'fail' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : ''}
                    onClick={() => handleGrade(i, 'fail')}
                  >
                    <XCircle size={16} className="mr-2" /> Blanked
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button 
            className="w-full"
            disabled={!allGraded}
            onClick={() => setPhase('summary')}
          >
            {allGraded ? 'Proceed to Summary' : 'Grade all concepts to continue'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 w-full h-full">
      <div className="max-w-4xl mx-auto">
        <SessionSummaryForm durationSeconds={totalSeconds} onFinish={handleFinish} />
        {phase === 'saving' && <p className="mt-3 text-center text-sm text-muted-foreground">Saving…</p>}
      </div>
    </div>
  );
}