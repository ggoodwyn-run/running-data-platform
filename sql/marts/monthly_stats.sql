CREATE TABLE IF NOT EXISTS marts.monthly_stats (
    year                      INTEGER NOT NULL,
    month_number              INTEGER NOT NULL,
    month_label               TEXT,
    total_runs                INTEGER,
    total_distance_km         NUMERIC(10,2),
    total_distance_miles      NUMERIC(10,2),
    total_moving_time_minutes NUMERIC,
    total_moving_time_hours   NUMERIC(10,2),
    avg_pace_min_per_km       NUMERIC(10,2),
    avg_pace_min_per_mile     NUMERIC(10,2),
    avg_hr                    NUMERIC(10,1),
    total_calories            INTEGER,
    total_ascent              INTEGER,
    avg_distance_km           NUMERIC(10,2),
    longest_run_km            NUMERIC(10,2),
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (year, month_number)
);
