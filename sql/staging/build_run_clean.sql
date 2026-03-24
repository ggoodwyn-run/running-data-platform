TRUNCATE TABLE staging.runs_clean;

INSERT INTO staging.runs_clean (

    activity_id,
    activity_type,
    date_of_activity,
    title,
    distance,
    Caolories,
    avg_HR,
    max_HR,
    avg_run_cadence,
    avg_pace,
    total_ascent,
    total_descent,
    avg_stride_length,
    steps,
    moving_time_minutes,
    elapsed_time_minutes
)

SELECT
    activity_id,
    activity_type,
    date_of_activity::date,
    title,
    coalesce(distance, 0),
    Caolories,
    avg_HR,
    max_HR,
    avg_run_cadence,
    avg_pace,
    total_ascent,
    total_descent,
    avg_stride_length,
    steps,
    moving_time_minutes,
    elapsed_time_minutes

FROM raw_data.runs_raw;