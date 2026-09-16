import { useEffect, useState, useMemo } from 'react';
import { BrainCircuit, CheckCircle2, XCircle, Play, Calendar } from 'lucide-react';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/shared/components/ui/button';
import { MethodBadge } from '@/shared/components/MethodBadge';
import { SessionSummaryForm, type SessionSummaryData } from '../sessions/study-methods/shared/SessionSummaryForm';
import { MethodExplanation } from '@/shared/components/MethodExplanation';

import { selectDueSRSConcepts, selectAllSRSConcepts, reviewConcept, fetchSRSConcepts } from './srsSlice';
import { selectSubjects } from '../subjects/subjectsSlice';
import { startSession, finishSession } from '../sessions/sessionsSlice';
import type { WeakConcept } from '@shared/types';

type Phase = 'setup' | 'active' | 'summary' | 'saving';

export default function SRSPage() {
  const dispatch = useAppDispatch();
  
  const dueConcepts = useAppSelector(selectDueSRSConcepts);
  const allConcepts = useAppSelector(selectAllSRSConcepts);
  const subjects = useAppSelector(selectSubjects);

  useEffect(() => {
    dispatch(fetchSRSConcepts());
  }, [dispatch]);

  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  
  // Flashcard state
  const [reviewQueue, setReviewQueue] = useState<WeakConcept[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Timer state
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  // Group DUE concepts by subject
  const dueBySubject = useMemo(() => {
    const groups: Record<number, WeakConcept[]> = {};
    dueConcepts.forEach(c => {
      if (!groups[c.subject_id]) groups[c.subject_id] = [];
      groups[c.subject_id].push(c);
    });
    return groups;
  }, [dueConcepts]);

  // Group UPCOMING concepts by date (Forecast Calendar)
  const upcomingSchedule = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const cutoff = endOfToday.toISOString();
    
    // Only grab concepts that are strictly due tomorrow or later
    const future = allConcepts.filter(c => c.next_review_date > cutoff);
    
    future.sort((a, b) => a.next_review_date.localeCompare(b.next_review_date));

    const groups: Array<{ dateLabel: string; concepts: WeakConcept[] }> = [];
    
    future.forEach(c => {
      const dateObj = new Date(c.next_review_date);
      const label = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      
      const existingGroup = groups.find(g => g.dateLabel === label);
      if (existingGroup) {
        existingGroup.concepts.push(c);
      } else {
        groups.push({ dateLabel: label, concepts: [c] });
      }
    });
    
    return groups.slice(0, 7); // Show max 7 upcoming review days
  }, [allConcepts]);

  async function handleStartSession(concept: WeakConcept) {
    setReviewQueue([concept]);
    setSelectedSubjectId(concept.subject_id);
    setCurrentIndex(0);
    setShowAnswer(false);
    
    const startTime = Date.now();
    const session = await dispatch(
      startSession({ 
        subject_id: concept.subject_id, 
        method: 'active_recall',
        started_at: new Date(startTime).toISOString() 
      })
    ).unwrap();
    
    setSessionId(session.id);
    setSessionStartTime(startTime);
    setPhase('active');
  }

  function handleGrade(passed: boolean) {
    const currentConcept = reviewQueue[currentIndex];
    
    dispatch(reviewConcept({ id: currentConcept.id, passed }));
    
    if (currentIndex + 1 < reviewQueue.length) {
      setCurrentIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      setTotalSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
      setPhase('summary');
    }
  }

  async function handleFinish(data: SessionSummaryData) {
    if (!sessionId) return;
    setPhase('saving');
    
    const guaranteedSeconds = Math.max(60, totalSeconds);
    const finalNotes = data.notes 
      ? `Single Concept Review: "${reviewQueue[0]?.concept_text}"\n\n${data.notes}` 
      : `Single Concept Review: "${reviewQueue[0]?.concept_text}"`;

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
    
    setSessionId(null);
    setTotalSeconds(0);
    setReviewQueue([]);
    setPhase('setup');
  }

  if (phase === 'setup') {
    return (
      <div className="space-y-12 p-10 w-full h-full pb-24">
        {/* --- DUE NOW SECTION --- */}
        <div>
          <div className="mb-6">
            <h1 className="flex items-center gap-3 text-2xl font-display">
              Review Bank <BrainCircuit className="text-accent" />
            </h1>
          </div>

         <MethodExplanation 
            title="How Spaced Repetition Works"
            description="Our SM-2 algorithm tracks your memory decay mathematically. It calculates your personal 'Ease Factor' for every concept to test you right before you forget it."
            mechanics={[
              { action: "Knew it", result: "The algorithm increases your Ease Factor and multiplies the time until your next review (e.g., 3 days ➔ 8 days ➔ 20 days)." },
              { action: "Blanked", result: "The algorithm penalizes your Ease Factor and resets the interval. You will review it again tomorrow." }
            ]}
            bestFor="Ensuring the concepts you learned last month don't disappear before finals."
          />

          <div className="mt-8 w-full">
            {Object.keys(dueBySubject).length === 0 ? (
              <div className="text-center w-full py-16 border-2 border-dashed border-border rounded-lg bg-muted/20">
                <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">You're all caught up!</h3>
                <p className="text-sm text-muted-foreground">No concepts are due for review right now.</p>
              </div>
            ) : (
              <div className="space-y-8 w-full">
                {Object.entries(dueBySubject).map(([subjectIdStr, concepts]) => {
                  const subjectId = Number(subjectIdStr);
                  const subject = subjects.find(s => s.id === subjectId);
                  
                  return (
                    <div key={subjectId} className="space-y-4 w-full">
                      <h2 className="text-xl font-bold border-b border-border pb-2 text-foreground">
                        {subject ? subject.name : 'Unknown Subject'}
                      </h2>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {concepts.map((concept) => (
                          <div key={concept.id} className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between shadow-sm">
                            <h3 className="font-medium text-lg leading-snug mb-6">{concept.concept_text}</h3>
                            <Button 
                              className="w-full mt-auto" 
                              onClick={() => handleStartSession(concept)}
                            >
                              <Play size={16} className="mr-2" /> Review
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* --- UPCOMING FORECAST SECTION --- */}
        {upcomingSchedule.length > 0 && (
          <div className="space-y-6 border-t border-border pt-10 w-full">
            <h2 className="text-xl font-display flex items-center gap-3">
              <Calendar className="text-muted-foreground" size={24} />
              Upcoming Forecast
            </h2>
            
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {upcomingSchedule.map((group) => (
                <div key={group.dateLabel} className="bg-accent/5 border border-accent/20 rounded-lg overflow-hidden h-full">
                  <div className="bg-accent/10 px-5 py-3 border-b border-accent/10">
                    <h3 className="font-medium text-accent">{group.dateLabel}</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {group.concepts.map(concept => {
                      const subject = subjects.find(s => s.id === concept.subject_id);
                      return (
                        <div key={concept.id} className="flex flex-col gap-2 p-3 bg-card rounded-md border border-border shadow-sm">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {subject ? subject.name : 'Unknown'}
                          </span>
                          <span className="text-sm">{concept.concept_text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'active') {
    const currentConcept = reviewQueue[currentIndex];
    
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-10 pb-24">
        <div className="w-full flex items-center justify-between mb-8 max-w-4xl">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Reviewing Single Concept
          </p>
          <MethodBadge method="active_recall" />
        </div>

        <div className="w-full max-w-4xl bg-card border-2 border-border rounded-xl p-10 shadow-sm min-h-64 flex flex-col items-center justify-center space-y-8">
          <h2 className="text-2xl font-medium text-center leading-relaxed">
            {currentConcept?.concept_text}
          </h2>

          <div className="w-full max-w-sm mt-8">
            {!showAnswer ? (
              <Button size="lg" className="w-full" onClick={() => setShowAnswer(true)}>
                Show Answer
              </Button>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-sm text-center text-muted-foreground font-medium">Did you recall it accurately?</p>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    size="lg"
                    variant="outline" 
                    className="w-full bg-red-600/10 hover:bg-red-600 hover:text-white border-red-600/20 text-red-600 transition-colors"
                    onClick={() => handleGrade(false)}
                  >
                    <XCircle size={18} className="mr-2" /> Blanked
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline" 
                    className="w-full bg-green-600/10 hover:bg-green-600 hover:text-white border-green-600/20 text-green-600 transition-colors"
                    onClick={() => handleGrade(true)}
                  >
                    <CheckCircle2 size={18} className="mr-2" /> Knew it
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 w-full h-full">
      <div className="mb-8 text-left">
        <h2 className="text-2xl font-bold">Review Complete!</h2>
      </div>
      <div className="max-w-4xl">
        <SessionSummaryForm durationSeconds={totalSeconds} onFinish={handleFinish} />
        {phase === 'saving' && <p className="mt-3 text-sm text-muted-foreground">Saving to your analytics…</p>}
      </div>
    </div>
  );
}