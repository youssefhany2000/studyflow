import type Database from 'better-sqlite3';

import { registerAnalyticsIpc } from './analytics';
import { registerGoalsIpc } from './goals';
import { registerPlannerIpc } from './planner';
import { registerSessionsIpc } from './sessions';
import { registerSubjectsIpc } from './subjects';
import { registerSrsIpc } from './srs'; // <-- Imported

export function registerAllIpcHandlers(db: Database.Database): void {
  registerSubjectsIpc(db);
  registerSessionsIpc(db);
  registerGoalsIpc(db);
  registerPlannerIpc(db);
  registerAnalyticsIpc(db);
  registerSrsIpc(db); 
}