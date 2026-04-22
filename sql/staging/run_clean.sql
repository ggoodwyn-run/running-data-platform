DROP TABLE IF EXISTS staging.runs_clean;

CREATE TABLE staging.runs_clean (
    activity_id          UUID PRIMARY KEY NOT NULL,
    activity_type        TEXT NOT NULL,
    date_of_activity     DATE NOT NULL,
    title                TEXT,
    distance             NUMERIC(10,2) NOT NULL,
    moving_time_minutes  NUMERIC,
    elapsed_time_minutes NUMERIC,
    calories             INTEGER,
    avg_hr               INTEGER,
    max_hr               INTEGER,
    avg_run_cadence      INTEGER,
    avg_pace             NUMERIC(10,2),
    total_ascent         INTEGER,
    total_descent        INTEGER,
    avg_stride_length    NUMERIC(5,2),
    steps                INTEGER,
    week_start           DATE,
    month_start          DATE,
    year                 INTEGER,
    month_number         INTEGER,
    day_of_week          TEXT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
