import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';

import type { Subject, SubjectInput } from '../../shared/types';
import { toBool } from './serialize';

interface SubjectRow {
  id: number;
  name: string;
  color: string;
  weekly_goal_minutes: number | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

function toSubject(row: SubjectRow): Subject {
  return { ...row, is_archived: toBool(row.is_archived) };
}

export function registerSubjectsIpc(db: Database.Database): void {
  ipcMain.handle('subjects:list', (_event, includeArchived = false) => {
    const rows = (
      includeArchived
        ? db.prepare('SELECT * FROM subjects ORDER BY name').all()
        : db.prepare('SELECT * FROM subjects WHERE is_archived = 0 ORDER BY name').all()
    ) as SubjectRow[];
    return rows.map(toSubject);
  });

  ipcMain.handle('subjects:create', (_event, input: SubjectInput): Subject => {
    const result = db
      .prepare('INSERT INTO subjects (name, color, weekly_goal_minutes) VALUES (?, ?, ?)')
      .run(input.name, input.color, input.weekly_goal_minutes ?? null);
    const row = db.prepare('SELECT * FROM subjects WHERE id = ?').get(result.lastInsertRowid) as SubjectRow;
    return toSubject(row);
  });

  ipcMain.handle(
    'subjects:update',
    (_event, id: number, input: Partial<SubjectInput> & { is_archived?: boolean }): Subject => {
      const current = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as SubjectRow | undefined;
      if (!current) throw new Error(`Subject ${id} not found`);

      const next = {
        name: input.name ?? current.name,
        color: input.color ?? current.color,
        weekly_goal_minutes:
          input.weekly_goal_minutes !== undefined ? input.weekly_goal_minutes : current.weekly_goal_minutes,
        is_archived: input.is_archived !== undefined ? (input.is_archived ? 1 : 0) : current.is_archived,
      };
      db.prepare(
        `UPDATE subjects SET name = ?, color = ?, weekly_goal_minutes = ?, is_archived = ?,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      ).run(next.name, next.color, next.weekly_goal_minutes, next.is_archived, id);

      const row = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id) as SubjectRow;
      return toSubject(row);
    },
  );

  ipcMain.handle('subjects:delete', (_event, id: number): void => {
    db.prepare(
      `UPDATE subjects SET is_archived = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    ).run(id);
  });
}
