
CREATE TABLE raw_data.runs_raw (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type TEXT,
    date_of_activity TIMESTAMP,
    title TEXT,
    distance NUMERIC(10,2),
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
    loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);