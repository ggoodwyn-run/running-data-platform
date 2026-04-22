TRUNCATE TABLE staging.runs_clean;

INSERT INTO staging.runs_clean (
    activity_id,
    activity_type,
    date_of_activity,
    title,
    distance,
    moving_time_minutes,
    elapsed_time_minutes,
    calories,
    avg_hr,
    max_hr,
    avg_run_cadence,
    avg_pace,
    total_ascent,
    total_descent,
    avg_stride_length,
    steps,
    week_start,
    month_start,
    year,
    month_number,
    day_of_week
)
SELECT
    activity_id,
    activity_type,
    date_of_activity::date,
    title,
    COALESCE(distance, 0),
    moving_time_minutes,
    elapsed_time_minutes,
    calories,
    avg_hr,
    max_hr,
    avg_run_cadence,
    avg_pace,
    total_ascent,
    total_descent,
    avg_stride_length,
    steps,
    date_trunc('week', date_of_activity)::date           AS week_start,
    date_trunc('month', date_of_activity)::date          AS month_start,
    EXTRACT(year  FROM date_of_activity)::integer        AS year,
    EXTRACT(month FROM date_of_activity)::integer        AS month_number,
    TRIM(TO_CHAR(date_of_activity, 'Day'))               AS day_of_week
FROM raw_data.runs_raw
WHERE date_of_activity IS NOT NULL
  AND activity_type = 'Running';
