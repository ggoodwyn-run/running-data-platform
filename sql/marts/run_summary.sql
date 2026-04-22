CREATE TABLE IF NOT EXISTS marts.run_summary (
    activity_id           UUID PRIMARY KEY NOT NULL,
    date_of_activity      DATE NOT NULL,
    title                 TEXT,
    year                  INTEGER,
    month_number          INTEGER,
    month_label           TEXT,           -- e.g. 'Mar 2026'
    week_start            DATE,
    day_of_week           TEXT,
    distance_km           NUMERIC(10,2),
    distance_miles        NUMERIC(10,2),
    moving_time_minutes   NUMERIC,
    moving_time_hours     NUMERIC(10,2),
    elapsed_time_minutes  NUMERIC,
    avg_pace_min_per_km   NUMERIC(10,2),  -- decimal minutes, e.g. 7.75 = 7:45/km
    avg_pace_min_per_mile NUMERIC(10,2),
    avg_hr                INTEGER,
    max_hr                INTEGER,
    avg_run_cadence       INTEGER,
    calories              INTEGER,
    total_ascent          INTEGER,
    total_descent         INTEGER,
    avg_stride_length     NUMERIC(5,2),
    steps                 INTEGER,
    effort_zone           TEXT,           -- Easy / Moderate / Hard / Max Effort
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
