import type {
  AnalyticsSummary,
  DailyGoal,
  PlannedSession,
  PomodoroCycle,
  PomodoroSettings,
  SessionStage,
  Subject,
  StudySession,
  StudySessionWithChildren,
  WeeklyGoal,
} from '../../shared/types';

export interface StudyFlowApi {
  subjects: {
    list(includeArchived?: boolean): Promise<Subject[]>;
    create(input: unknown): Promise<Subject>;
    update(id: number, input: unknown): Promise<Subject>;
    delete(id: number): Promise<void>;
  };
  sessions: {
    list(method?: string): Promise<StudySession[]>;
    get(id: number): Promise<StudySessionWithChildren>;
    create(input: unknown): Promise<StudySession>;
    update(id: number, input: unknown): Promise<StudySession>;
    delete(id: number): Promise<void>;
    stages: {
      create(sessionId: number, input: unknown): Promise<SessionStage>;
      update(stageId: number, input: unknown): Promise<SessionStage>;
    };
    pomodoroCycles: {
      create(sessionId: number, input: unknown): Promise<PomodoroCycle>;
      update(cycleId: number, input: unknown): Promise<PomodoroCycle>;
    };
  };
  pomodoroSettings: {
    get(): Promise<PomodoroSettings>;
    update(input: unknown): Promise<PomodoroSettings>;
  };
  goals: {
    daily: {
      list(): Promise<DailyGoal[]>;
      upsert(input: unknown): Promise<DailyGoal>;
    };
    weekly: {
      list(): Promise<WeeklyGoal[]>;
      upsert(input: unknown): Promise<WeeklyGoal>;
    };
  };
  planner: {
    list(range?: unknown): Promise<PlannedSession[]>;
    create(input: unknown): Promise<PlannedSession>;
    fulfill(plannedId: number, sessionId: number): Promise<PlannedSession>;
    delete(id: number): Promise<void>;
  };
  analytics: {
    summary(range: unknown): Promise<AnalyticsSummary>;
    streak(): Promise<{ streak: number }>;
  };
}

declare global {
  interface Window {
    api: StudyFlowApi;
  }
}