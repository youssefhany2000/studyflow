import { useEffect, useRef, useState } from 'react';
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas';
import { RotateCcw, Undo2, ChevronLeft, ChevronRight, Plus, Palette, Activity } from 'lucide-react';

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

type Phase = 'setup' | 'drafting' | 'starting' | 'active' | 'audit' | 'summary' | 'saving';

export default function BlurtingStudy() {
  const dispatch = useAppDispatch();
  const activeSession = useAppSelector(selectActiveSession);
  const canvasRef = useRef<ReactSketchCanvasRef>(null);

  const [phase, setPhase] = useState<Phase>('setup');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  
  const [topic, setTopic] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [displaySeconds, setDisplaySeconds] = useState(0);

  // Multi-page state
  const [pagePaths, setPagePaths] = useState<any[][]>([[]]);
  const [pageImages, setPageImages] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(0);

  // Pen Controls
  const [activeColor, setActiveColor] = useState('#ffffff');
  const [auditColor, setAuditColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);

  useEffect(() => {
    if (activeSession && activeSession.method === 'blurting') {
      const backup = localStorage.getItem('blurting_backup');
      if (backup) {
        try {
          const parsed = JSON.parse(backup);
          if (parsed.sessionId === activeSession.id) {
            setSessionId(parsed.sessionId);
            setPhase(parsed.phase as Phase);
            setTopic(parsed.topic || '');
            setSessionStartTime(parsed.sessionStartTime);
            setTotalSeconds(parsed.totalSeconds || 0);
            return;
          }
        } catch (e) {
          console.error("Failed to restore backup", e);
        }
      }
      setSessionId(activeSession.id);
      setSessionStartTime(activeSession.startedAt);
      setPhase(activeSession.phase as Phase);
    }
  }, [activeSession]);

  useEffect(() => {
    if (sessionId && phase !== 'setup' && phase !== 'drafting') {
      try {
        localStorage.setItem('blurting_backup', JSON.stringify({
          sessionId, phase, topic, sessionStartTime, totalSeconds
        }));
      } catch (e) {
        // Ignore quota exceeded errors
      }
    }
  }, [sessionId, phase, topic, sessionStartTime, totalSeconds]);

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

  async function handleStartSession() {
    if (!topic.trim() || !selectedSubjectId) return;
    setPhase('starting');
    
    const startTime = Date.now();
    const session = await dispatch(
      startSession({ subject_id: selectedSubjectId, method: 'blurting', started_at: new Date(startTime).toISOString() }),
    ).unwrap();
    
    setSessionId(session.id);
    setSessionStartTime(startTime);
    setPhase('active');

    dispatch(setActiveSession({ 
      id: session.id, method: 'blurting', startedAt: startTime, subjectId: selectedSubjectId, phase: 'active' 
    }));
  }

  function handleEndBlurting() {
    setTotalSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    setPhase('audit');
  }

  // --- Multi-Page & Image Export Logic ---
  async function saveCurrentPageData() {
    if (canvasRef.current) {
      const paths = await canvasRef.current.exportPaths();
      const base64 = await canvasRef.current.exportImage('png');
      
      setPagePaths(prev => {
        const newPaths = [...prev];
        newPaths[currentPage] = paths;
        return newPaths;
      });

      setPageImages(prev => ({
        ...prev,
        [currentPage]: base64
      }));
    }
  }

  async function changePage(newIndex: number) {
    await saveCurrentPageData();
    setCurrentPage(newIndex);
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      setTimeout(() => {
        if (pagePaths[newIndex] && pagePaths[newIndex].length > 0) {
          canvasRef.current?.loadPaths(pagePaths[newIndex]);
        }
      }, 50);
    }
  }

  async function addNewPage() {
    await saveCurrentPageData();
    const newIndex = pagePaths.length;
    setPagePaths(prev => [...prev, []]);
    setCurrentPage(newIndex);
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  }

  async function handleProceedToSummary() {
    // 1. Save the final page data
    if (canvasRef.current) {
      const paths = await canvasRef.current.exportPaths();
      const base64 = await canvasRef.current.exportImage('png');
      
      setPagePaths(prev => {
        const newPaths = [...prev];
        newPaths[currentPage] = paths;
        return newPaths;
      });

      const finalImages = {
        ...pageImages,
        [currentPage]: base64
      };
      setPageImages(finalImages);

      // 2. Automatically download all drawn pages as actual PNG files
      Object.keys(finalImages).forEach((key) => {
        const link = document.createElement('a');
        link.href = finalImages[Number(key)];
        const safeTopicName = topic.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        link.download = `blurting-${safeTopicName}-page${Number(key) + 1}.png`;
        link.click();
      });
    }
    
    // 3. Move to the summary phase
    setPhase('summary');
  }

  async function handleFinish(data: SessionSummaryData) {
    if (!sessionId) return;
    setPhase('saving');
    
    const guaranteedSeconds = Math.max(60, totalSeconds);
    
    // Keep notes clean: No Base64 injection here!
    const finalNotes = data.notes 
      ? `Topic: ${topic} (${pagePaths.length} pages drawn)\n\n${data.notes}` 
      : `Topic: ${topic} (${pagePaths.length} pages drawn)`;

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
    localStorage.removeItem('blurting_backup');
    setSessionId(null);
    setTopic('');
    setTotalSeconds(0);
    setPagePaths([[]]);
    setPageImages({});
    setCurrentPage(0);
    setPhase('setup');
  }

  if (phase === 'setup') {
    return (
      <div className="space-y-6 p-10">
        <h1 className="flex items-center gap-3 text-2xl font-display mb-2">
          Blurting <MethodBadge method="blurting" />
        </h1>
        
        <MethodExplanation 
          title="How Blurting Works"
          description="Brain dump everything you know about a topic onto a blank canvas from memory. Once you're completely drained, open your notes to fill in the exact gaps you missed with a red pen."
          mechanics={[
            { action: "Brain Dump", result: "Draw and write everything you can remember without looking at your notes." },
            { action: "Red Pen Audit", result: "Open your notes. Use a contrasting color to correct mistakes and add the missing details." }
          ]}
          bestFor="Connecting broad concepts, mapping out system architectures, or finding hidden weak spots right before an exam."
        />

        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-4">Pick a subject to begin:</p>
        <SubjectPicker onSelect={handleSubjectSelect} />
      </div>
    );
  }

  if (phase === 'drafting' || phase === 'starting') {
    return (
      <div className="mx-auto max-w-lg space-y-6 p-10">
        <h1 className="text-2xl font-display">Define the Topic</h1>
        <p className="text-sm text-muted-foreground">What broad concept are you about to dump from memory?</p>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., The Nervous System, React Hooks, World War 2..."
          className="flex h-12 w-full rounded-md border border-input bg-transparent px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button 
          className="w-full mt-4"
          disabled={!topic.trim() || phase === 'starting'}
          onClick={handleStartSession}
        >
          {phase === 'starting' ? 'Starting...' : 'Start Blurting'}
        </Button>
      </div>
    );
  }

  if (phase === 'active' || phase === 'audit') {
    const minutes = Math.floor((phase === 'active' ? displaySeconds : totalSeconds) / 60);
    const seconds = (phase === 'active' ? displaySeconds : totalSeconds) % 60;
    
    // Apply the correct color based on phase and user selection
    const currentStrokeColor = phase === 'active' ? activeColor : auditColor; 

    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold">{topic}</h2>
            <p className="text-sm text-muted-foreground">
              {phase === 'active' ? 'Draw and write everything you know.' : 'Open your notes. Use the red pen to correct your work.'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {phase === 'active' ? 'Brain Dump' : 'Red Pen Audit'}
            </p>
            <p className="font-mono text-3xl tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between w-full flex-wrap gap-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => canvasRef.current?.undo()}>
              <Undo2 size={16} className="mr-2" /> Undo
            </Button>
            <Button variant="outline" size="sm" onClick={() => canvasRef.current?.clearCanvas()}>
              <RotateCcw size={16} className="mr-2" /> Clear
            </Button>
            
            {/* Pen Controls */}
            <div className="flex items-center gap-3 bg-muted/50 px-3 py-1 rounded-md ml-2 border border-border">
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-muted-foreground" />
                <input 
                  type="color" 
                  value={currentStrokeColor}
                  onChange={(e) => phase === 'active' ? setActiveColor(e.target.value) : setAuditColor(e.target.value)}
                  className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
                  title="Change Pen Color"
                />
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-muted-foreground" />
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={strokeWidth}
                  onChange={(e) => setStrokeWidth(Number(e.target.value))}
                  className="w-20 cursor-pointer"
                  title="Change Pen Size"
                />
              </div>
            </div>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center gap-3 bg-muted/50 px-3 py-1 rounded-md border border-border">
            <Button variant="ghost" size="icon" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 0}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium w-24 text-center">
              Page {currentPage + 1} of {pagePaths.length}
            </span>
            <Button variant="ghost" size="icon" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pagePaths.length - 1}>
              <ChevronRight size={16} />
            </Button>
            <div className="w-px h-6 bg-border mx-1" />
            <Button variant="ghost" size="sm" onClick={addNewPage}>
              <Plus size={16} className="mr-2" /> New Page
            </Button>
          </div>
        </div>

        <div className="flex-1 w-full rounded-lg overflow-hidden border-2 border-border bg-black">
          <ReactSketchCanvas
            ref={canvasRef}
            strokeWidth={strokeWidth}
            strokeColor={currentStrokeColor}
            canvasColor="transparent"
            className="w-full h-full"
          />
        </div>

        <div className="shrink-0 flex justify-end">
          {phase === 'active' ? (
            <Button size="lg" onClick={handleEndBlurting}>I'm Done Blurting</Button>
          ) : (
            <Button size="lg" variant="accent" onClick={handleProceedToSummary}>
              Attach to Session & Proceed
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-10">
      <SessionSummaryForm durationSeconds={totalSeconds} onFinish={handleFinish} />
      {phase === 'saving' && <p className="mt-3 text-center text-sm text-muted-foreground">Saving…</p>}
    </div>
  );
}