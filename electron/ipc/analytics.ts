import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';

export function registerAnalyticsIpc(db: Database.Database): void {
  ipcMain.handle('analytics:summary', (_event, range: { from: string; to: string }) => {
    // added 'as any' here so TS knows we can spread it later
    const totals = db
      .prepare(
        `SELECT COUNT(*) as session_count, COALESCE(SUM(duration_seconds), 0) as total_seconds,
                AVG(productivity_score) as avg_productivity, COALESCE(SUM(interruptions_count), 0) as total_interruptions
         FROM study_sessions WHERE status = 'completed' AND started_at BETWEEN ? AND ?`,
      )
      .get(range.from, range.to) as any; 

    const mostStudiedSubject = db
      .prepare(
        `SELECT s.id, s.name, SUM(ss.duration_seconds) as total_seconds
         FROM study_sessions ss JOIN subjects s ON s.id = ss.subject_id
         WHERE ss.status = 'completed' AND ss.started_at BETWEEN ? AND ?
         GROUP BY s.id ORDER BY total_seconds DESC LIMIT 1`,
      )
      .get(range.from, range.to) ?? null;

    const mostUsedMethod = db
      .prepare(
        `SELECT method, COUNT(*) as count FROM study_sessions
         WHERE status = 'completed' AND started_at BETWEEN ? AND ?
         GROUP BY method ORDER BY count DESC LIMIT 1`,
      )
      .get(range.from, range.to) ?? null;

    return { ...totals, mostStudiedSubject, mostUsedMethod };
  });

  ipcMain.handle('analytics:streak', () => {
    const rows = db
      .prepare(`SELECT started_at FROM study_sessions WHERE status = 'completed'`)
      .all() as { started_at: string }[];

    // group by local days so late-night sessions don't bleed into tomorrow via UTC
    const localDayKeys = new Set(
      rows.map((r) => {
        const d = new Date(r.started_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }),
    );

    const keyFor = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    // if they haven't studied yet today, check if the streak is still alive from yesterday
    if (!localDayKeys.has(keyFor(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (localDayKeys.has(keyFor(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { streak };
  });
}