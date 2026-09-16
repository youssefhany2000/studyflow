import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';

import type {
  PomodoroCycle,
  SessionStage,
  StudySession,
  StudySessionCreateInput,
  StudySessionUpdateInput,
  StudySessionWithChildren,
} from '../../shared/types';
import { toBool } from './serialize';

interface PomodoroCycleRow extends Omit<PomodoroCycle, 'was_interrupted'> {
  was_interrupted: number;
}

function toCycle(row: PomodoroCycleRow): PomodoroCycle {
  return { ...row, was_interrupted: toBool(row.was_interrupted) };
}

export function registerSessionsIpc(db: Database.Database): void {
  ipcMain.handle('sessions:list', (_event, method?: string) => {
    const rows = method
      ? db.prepare('SELECT * FROM study_sessions WHERE method = ? ORDER BY started_at DESC').all(method)
      : db.prepare('SELECT * FROM study_sessions ORDER BY started_at DESC').all();
    return rows as StudySession[];
  });

  ipcMain.handle('sessions:get', (_event, id: number): StudySessionWithChildren => {
    const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id) as StudySession | undefined;
    if (!session) throw new Error(`Session ${id} not found`);

    const stages = db
      .prepare('SELECT * FROM session_stages WHERE session_id = ? ORDER BY stage_order')
      .all(id) as SessionStage[];
    const cycleRows = db
      .prepare('SELECT * FROM pomodoro_cycles WHERE session_id = ? ORDER BY cycle_number')
      .all(id) as PomodoroCycleRow[];

    return { ...session, stages, pomodoro_cycles: cycleRows.map(toCycle) };
  });

  ipcMain.handle('sessions:create', (_event, input: StudySessionCreateInput): StudySession => {
    const result = db
      .prepare('INSERT INTO study_sessions (subject_id, method, started_at) VALUES (?, ?, ?)')
      .run(input.subject_id, input.method, input.started_at);
    return db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(result.lastInsertRowid) as StudySession;
  });

  ipcMain.handle('sessions:update', (_event, id: number, input: StudySessionUpdateInput): StudySession => {
    const current = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id) as StudySession | undefined;
    if (!current) throw new Error(`Session ${id} not found`);
    const next = { ...current, ...input };
    db.prepare(
      `UPDATE study_sessions SET status = ?, ended_at = ?, duration_seconds = ?, mood = ?,
       productivity_score = ?, interruptions_count = ?, notes = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(
      next.status, next.ended_at, next.duration_seconds, next.mood,
      next.productivity_score, next.interruptions_count, next.notes, id,
    );
    return db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(id) as StudySession;
  });

  // NEW: Delete Session Handler
  ipcMain.handle('sessions:delete', (_event, id: number) => {
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM session_stages WHERE session_id = ?').run(id);
      db.prepare('DELETE FROM pomodoro_cycles WHERE session_id = ?').run(id);
      db.prepare('DELETE FROM study_sessions WHERE id = ?').run(id);
    });
    
    deleteTransaction();
  });

  // --- stages: Deep Work, Active Recall, Feynman, Blurting ---
  ipcMain.handle(
    'sessions:stages:create',
    (_event, sessionId: number, input: { stage_name: string; stage_order: number; content?: string | null }): SessionStage => {
      const result = db
        .prepare('INSERT INTO session_stages (session_id, stage_name, stage_order, content) VALUES (?, ?, ?, ?)')
        .run(sessionId, input.stage_name, input.stage_order, input.content ?? null);
      return db.prepare('SELECT * FROM session_stages WHERE id = ?').get(result.lastInsertRowid) as SessionStage;
    },
  );

  ipcMain.handle(
    'sessions:stages:update',
    (_event, stageId: number, input: Partial<Pick<SessionStage, 'content' | 'rating' | 'completed_at'>>): SessionStage => {
      const current = db.prepare('SELECT * FROM session_stages WHERE id = ?').get(stageId) as SessionStage | undefined;
      if (!current) throw new Error(`Stage ${stageId} not found`);
      const next = { ...current, ...input };
      db.prepare(
        `UPDATE session_stages SET content = ?, rating = ?, completed_at = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      ).run(next.content, next.rating, next.completed_at, stageId);
      return db.prepare('SELECT * FROM session_stages WHERE id = ?').get(stageId) as SessionStage;
    },
  );

  // --- pomodoro cycles ---
  ipcMain.handle(
    'sessions:pomodoroCycles:create',
    (_event, sessionId: number, input: { cycle_number: number; type: string; planned_minutes: number }): PomodoroCycle => {
      const result = db
        .prepare('INSERT INTO pomodoro_cycles (session_id, cycle_number, type, planned_minutes) VALUES (?, ?, ?, ?)')
        .run(sessionId, input.cycle_number, input.type, input.planned_minutes);
      const row = db.prepare('SELECT * FROM pomodoro_cycles WHERE id = ?').get(result.lastInsertRowid) as PomodoroCycleRow;
      return toCycle(row);
    },
  );

  ipcMain.handle(
    'sessions:pomodoroCycles:update',
    (_event, cycleId: number, input: { actual_minutes?: number; was_interrupted?: boolean }): PomodoroCycle => {
      const current = db.prepare('SELECT * FROM pomodoro_cycles WHERE id = ?').get(cycleId) as PomodoroCycleRow | undefined;
      if (!current) throw new Error(`Cycle ${cycleId} not found`);
      const actualMinutes = input.actual_minutes ?? current.actual_minutes;
      const wasInterrupted = input.was_interrupted !== undefined ? (input.was_interrupted ? 1 : 0) : current.was_interrupted;
      db.prepare('UPDATE pomodoro_cycles SET actual_minutes = ?, was_interrupted = ? WHERE id = ?').run(
        actualMinutes, wasInterrupted, cycleId,
      );
      const row = db.prepare('SELECT * FROM pomodoro_cycles WHERE id = ?').get(cycleId) as PomodoroCycleRow;
      return toCycle(row);
    },
  );

  // --- pomodoro settings ---
  ipcMain.handle('pomodoroSettings:get', () => {
    return db.prepare('SELECT * FROM pomodoro_settings WHERE id = 1').get();
  });

  ipcMain.handle('pomodoroSettings:update', (_event, input: Record<string, number>) => {
    const current = db.prepare('SELECT * FROM pomodoro_settings WHERE id = 1').get() as Record<string, number>;
    const next = { ...current, ...input };
    db.prepare(
      `UPDATE pomodoro_settings SET work_minutes = ?, short_break_minutes = ?, long_break_minutes = ?,
       cycles_before_long_break = ? WHERE id = 1`,
    ).run(next.work_minutes, next.short_break_minutes, next.long_break_minutes, next.cycles_before_long_break);
    return db.prepare('SELECT * FROM pomodoro_settings WHERE id = 1').get();
  });
}