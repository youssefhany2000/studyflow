import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';

import type { PlannedSession } from '../../shared/types';

export function registerPlannerIpc(db: Database.Database): void {
  ipcMain.handle('planner:list', (_event, range?: { from: string; to: string }) => {
    const rows = range
      ? db
          .prepare(
            'SELECT * FROM planned_sessions WHERE planned_date BETWEEN ? AND ? ORDER BY planned_date, planned_start_time',
          )
          .all(range.from, range.to)
      : db.prepare('SELECT * FROM planned_sessions ORDER BY planned_date, planned_start_time').all();
    return rows as PlannedSession[];
  });

  ipcMain.handle(
    'planner:create',
    (
      _event,
      input: {
        subject_id: number;
        method: string;
        planned_date: string;
        planned_start_time?: string | null;
        planned_duration_minutes: number;
      },
    ): PlannedSession => {
      const result = db
        .prepare(
          `INSERT INTO planned_sessions (subject_id, method, planned_date, planned_start_time, planned_duration_minutes)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          input.subject_id, input.method, input.planned_date,
          input.planned_start_time ?? null, input.planned_duration_minutes,
        );
      return db.prepare('SELECT * FROM planned_sessions WHERE id = ?').get(result.lastInsertRowid) as PlannedSession;
    },
  );

  ipcMain.handle('planner:fulfill', (_event, plannedSessionId: number, studySessionId: number): PlannedSession => {
    db.prepare(
      `UPDATE planned_sessions SET status = 'completed', fulfilled_by_session_id = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(studySessionId, plannedSessionId);
    return db.prepare('SELECT * FROM planned_sessions WHERE id = ?').get(plannedSessionId) as PlannedSession;
  });

  ipcMain.handle('planner:delete', (_event, id: number): void => {
    db.prepare('DELETE FROM planned_sessions WHERE id = ?').run(id);
  });
}
