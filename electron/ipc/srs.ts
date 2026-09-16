import { ipcMain } from 'electron';
import type Database from 'better-sqlite3';

export function registerSrsIpc(db: Database.Database): void {
  // grab all concepts
  ipcMain.handle('srs:list', () => {
    return db.prepare('SELECT * FROM weak_concepts').all();
  });

  // handle sm-2 review math
  ipcMain.handle('srs:reviewConcept', (_event, input: { id: number; passed: boolean }) => {
    const { id, passed } = input;
    const concept = db.prepare('SELECT * FROM weak_concepts WHERE id = ?').get(id) as any;
    
    if (!concept) throw new Error(`Concept ${id} not found`);

    let ease_factor = concept.ease_factor;
    let interval_days = concept.interval_days;

    if (passed) {
      // bump interval based on current streak
      if (interval_days === 0) {
        interval_days = 1; 
      } else if (interval_days === 1) {
        interval_days = 3; 
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
      // slowly increase ease
      ease_factor = ease_factor + 0.1; 
    } else {
      // reset interval and penalize ease on failure
      interval_days = 1; 
      ease_factor = Math.max(1.3, ease_factor - 0.2); // keep floor at 1.3
    }

    // save new dates using standard UTC so React's Midnight Unlock math works perfectly
    db.prepare(`
      UPDATE weak_concepts 
      SET ease_factor = ?, 
          interval_days = ?, 
          next_review_date = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+' || ? || ' days'),
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `).run(ease_factor, interval_days, interval_days, id);

    // log review history
    db.prepare(`
      INSERT INTO concept_reviews (concept_id, passed) 
      VALUES (?, ?)
    `).run(id, passed ? 1 : 0);

    return db.prepare('SELECT * FROM weak_concepts WHERE id = ?').get(id);
  });

  // batch insert new concepts from a study session
  ipcMain.handle('srs:addConcepts', (_event, concepts: any[]) => {
    const insert = db.prepare(`
      INSERT INTO weak_concepts (subject_id, concept_text, ease_factor, interval_days, next_review_date)
      VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+' || ? || ' days'))
    `);
    
    // wrap in transaction so it doesn't block the db
    db.transaction(() => {
      for (const c of concepts) {
        const isFail = c.initial_grade === 'fail';
        const initialInterval = isFail ? 1 : 3; 
        insert.run(c.subject_id, c.concept_text, 2.5, initialInterval, initialInterval);
      }
    })();
    
    return true;
  });
}