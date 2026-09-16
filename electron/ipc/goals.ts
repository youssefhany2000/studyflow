import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';

import type { DailyGoal, WeeklyGoal } from '../../shared/types';

export function registerGoalsIpc(db: Database.Database): void {
  ipcMain.handle('goals:daily:list', () => {
    return db.prepare('SELECT * FROM daily_goals ORDER BY date DESC').all() as DailyGoal[];
  });

  ipcMain.handle('goals:daily:upsert', (_event, input: { date: string; target_minutes: number }): DailyGoal => {
    db.prepare(
      `INSERT INTO daily_goals (date, target_minutes) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET target_minutes = excluded.target_minutes,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    ).run(input.date, input.target_minutes);
    return db.prepare('SELECT * FROM daily_goals WHERE date = ?').get(input.date) as DailyGoal;
  });

  ipcMain.handle('goals:weekly:list', () => {
    return db.prepare('SELECT * FROM weekly_goals ORDER BY week_start_date DESC').all() as WeeklyGoal[];
  });

  ipcMain.handle(
    'goals:weekly:upsert',
    (_event, input: { week_start_date: string; target_minutes: number }): WeeklyGoal => {
      // The table's own CHECK (strftime('%w', week_start_date) = '6') rejects
      // anything but a Saturday — SQLite throws, no separate check needed here.
      db.prepare(
        `INSERT INTO weekly_goals (week_start_date, target_minutes) VALUES (?, ?)
         ON CONFLICT(week_start_date) DO UPDATE SET target_minutes = excluded.target_minutes,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      ).run(input.week_start_date, input.target_minutes);
      return db.prepare('SELECT * FROM weekly_goals WHERE week_start_date = ?').get(input.week_start_date) as WeeklyGoal;
    },
  );
}
