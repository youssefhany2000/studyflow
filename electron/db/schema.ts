import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    -- Core domain
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      weekly_goal_minutes INTEGER,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      method TEXT NOT NULL CHECK (method IN ('pomodoro','flowtime','deep_work','active_recall','feynman','blurting')),
      status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','abandoned')),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      mood INTEGER,
      productivity_score INTEGER,
      interruptions_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_method ON study_sessions(method);
    
    -- Added index on subject_id to prevent full table scans during ON DELETE CASCADE
    CREATE INDEX IF NOT EXISTS idx_study_sessions_subject_id ON study_sessions(subject_id); 

    CREATE TABLE IF NOT EXISTS session_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
      stage_name TEXT NOT NULL,
      stage_order INTEGER NOT NULL,
      content TEXT,
      rating INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE (session_id, stage_order)
    );
    CREATE INDEX IF NOT EXISTS idx_session_stages_session_id ON session_stages(session_id);

    -- App configuration & settings singletons
    CREATE TABLE IF NOT EXISTS pomodoro_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      work_minutes INTEGER NOT NULL DEFAULT 25,
      short_break_minutes INTEGER NOT NULL DEFAULT 5,
      long_break_minutes INTEGER NOT NULL DEFAULT 15,
      cycles_before_long_break INTEGER NOT NULL DEFAULT 4
    );
    INSERT OR IGNORE INTO pomodoro_settings (id) VALUES (1);
    
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      display_name TEXT,
      timezone TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    INSERT OR IGNORE INTO app_settings (id) VALUES (1);

    -- Session breakdown
    CREATE TABLE IF NOT EXISTS pomodoro_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
      cycle_number INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('work','short_break','long_break')),
      planned_minutes INTEGER NOT NULL,
      actual_minutes INTEGER,
      was_interrupted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pomodoro_cycles_session_id ON pomodoro_cycles(session_id);

    -- Goals & Planning
    CREATE TABLE IF NOT EXISTS daily_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      target_minutes INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start_date TEXT NOT NULL UNIQUE CHECK (strftime('%w', week_start_date) = '6'), -- 6 = Saturday
      target_minutes INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS planned_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      method TEXT NOT NULL CHECK (method IN ('pomodoro','flowtime','deep_work','active_recall','feynman','blurting')),
      planned_date TEXT NOT NULL,
      planned_start_time TEXT,
      planned_duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','missed')),
      fulfilled_by_session_id INTEGER UNIQUE REFERENCES study_sessions(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_planned_sessions_subject_id ON planned_sessions(subject_id);

    -- Spaced Repetition (SRS)
    CREATE TABLE IF NOT EXISTS weak_concepts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      concept_text TEXT NOT NULL,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      next_review_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_weak_concepts_subject_id ON weak_concepts(subject_id);

    CREATE TABLE IF NOT EXISTS concept_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concept_id INTEGER NOT NULL REFERENCES weak_concepts(id) ON DELETE CASCADE,
      session_id INTEGER REFERENCES study_sessions(id) ON DELETE SET NULL,
      passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
      reviewed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE INDEX IF NOT EXISTS idx_concept_reviews_concept_id ON concept_reviews(concept_id);
  `);
}