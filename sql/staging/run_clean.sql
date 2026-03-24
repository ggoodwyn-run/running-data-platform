CREATE TABLE IF NOT EXISTS staging.runs_clean (
    activity_id UUID PRIMARY KEY NOT NULL,
    activity_type TEXT NOT NULL,
    date_of_activity TIMESTAMP NOT NULL,
    title TEXT,
    distance NUMERIC(10,2) NOT NULL,
    calories INTEGER,
    avg_HR INTEGER,
    max_HR INTEGER,
    avg_run_cadence INTEGER,
    avg_pace NUMERIC(10,2),
    total_ascent INTEGER,
    total_descent INTEGER,
    avg_stride_length INTEGER,
    steps INTEGER,
    moving_time_minutes NUMERIC,
    elapsed_time_minutes NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);