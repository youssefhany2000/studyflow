export type StudyMethod = 'pomodoro' | 'flowtime' | 'deep_work' | 'active_recall' | 'blurting';
export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned';
export type PlannedSessionStatus = 'upcoming' | 'completed' | 'missed';
export type PomodoroCycleType = 'work' | 'short_break' | 'long_break';

export interface Subject {
  id: number;
  name: string;
  color: string;
  weekly_goal_minutes: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubjectInput {
  name: string;
  color: string;
  weekly_goal_minutes?: number | null;
}

export interface StudySession {
  id: number;
  subject_id: number;
  method: StudyMethod;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  mood: number | null;
  productivity_score: number | null;
  interruptions_count: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface StudySessionWithChildren extends StudySession {
  stages: SessionStage[];
  pomodoro_cycles: PomodoroCycle[];
}

export interface StudySessionCreateInput {
  subject_id: number;
  method: StudyMethod;
  started_at: string;
}

export interface StudySessionUpdateInput {
  status?: SessionStatus;
  ended_at?: string | null;
  duration_seconds?: number;
  mood?: number | null;
  productivity_score?: number | null;
  interruptions_count?: number;
  notes?: string;
}

export interface SessionStage {
  id: number;
  session_id: number;
  stage_name: string;
  stage_order: number;
  /** Prose as a plain string, or a JSON.stringify'd structure (e.g. a checklist) — caller's responsibility to parse. */
  content: string | null;
  rating: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PomodoroSettings {
  work_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  cycles_before_long_break: number;
}

export interface PomodoroCycle {
  id: number;
  session_id: number;
  cycle_number: number;
  type: PomodoroCycleType;
  planned_minutes: number;
  actual_minutes: number | null;
  was_interrupted: boolean;
  created_at: string;
}

export interface DailyGoal {
  id: number;
  date: string;
  target_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyGoal {
  id: number;
  week_start_date: string;
  target_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface PlannedSession {
  id: number;
  subject_id: number;
  method: StudyMethod;
  planned_date: string;
  planned_start_time: string | null;
  planned_duration_minutes: number;
  status: PlannedSessionStatus;
  fulfilled_by_session_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  session_count: number;
  total_seconds: number;
  avg_productivity: number | null;
  total_interruptions: number;
  mostStudiedSubject: { id: number; name: string; total_seconds: number } | null;
  mostUsedMethod: { method: StudyMethod; count: number } | null;
}

export type SRSLevel = 1 | 2 | 3 | 4;

export interface WeakConcept {
  id: number;
  subject_id: number;
  concept_text: string;
  srs_level: SRSLevel;
  next_review_date: string; 
  created_at: string;
  updated_at: string;
}

export interface AddConceptInput {
  subject_id: number;
  concept_text: string;
  initial_grade: 'partial' | 'fail';
}