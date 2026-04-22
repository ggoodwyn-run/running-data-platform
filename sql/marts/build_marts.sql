-- ============================================================
-- Build: marts.run_summary
-- One enriched row per run. Source: staging.runs_clean.
-- ============================================================
TRUNCATE TABLE marts.run_summary;

INSERT INTO marts.run_summary (
    activity_id,
    date_of_activity,
    title,
    year,
    month_number,
    month_label,
    week_start,
    day_of_week,
    distance_km,
    distance_miles,
    moving_time_minutes,
    moving_time_hours,
    elapsed_time_minutes,
    avg_pace_min_per_km,
    avg_pace_min_per_mile,
    avg_hr,
    max_hr,
    avg_run_cadence,
    calories,
    total_ascent,
    total_descent,
    avg_stride_length,
    steps,
    effort_zone
)
SELECT
    activity_id,
    date_of_activity,
    title,
    year,
    month_number,
    TO_CHAR(month_start, 'Mon YYYY')                AS month_label,
    week_start,
    day_of_week,
    distance                                        AS distance_km,
    ROUND(distance * 0.621371, 2)                   AS distance_miles,
    moving_time_minutes,
    ROUND(moving_time_minutes / 60.0, 2)            AS moving_time_hours,
    elapsed_time_minutes,
    avg_pace                                        AS avg_pace_min_per_km,
    ROUND(avg_pace * 1.60934, 2)                    AS avg_pace_min_per_mile,
    avg_hr,
    max_hr,
    avg_run_cadence,
    calories,
    total_ascent,
    total_descent,
    avg_stride_length,
    steps,
    -- Effort zone based on average heart rate.
    -- Thresholds are generic; adjust to your own HR zones if known.
    CASE
        WHEN avg_hr IS NULL             THEN 'Unknown'
        WHEN avg_hr < 140               THEN 'Easy'
        WHEN avg_hr BETWEEN 140 AND 155 THEN 'Moderate'
        WHEN avg_hr BETWEEN 156 AND 169 THEN 'Hard'
        ELSE                                 'Max Effort'
    END                                             AS effort_zone
FROM staging.runs_clean;


-- ============================================================
-- Build: marts.monthly_stats
-- Monthly rollup. Source: marts.run_summary (built above).
-- ============================================================
TRUNCATE TABLE marts.monthly_stats;

INSERT INTO marts.monthly_stats (
    year,
    month_number,
    month_label,
    total_runs,
    total_distance_km,
    total_distance_miles,
    total_moving_time_minutes,
    total_moving_time_hours,
    avg_pace_min_per_km,
    avg_pace_min_per_mile,
    avg_hr,
    total_calories,
    total_ascent,
    avg_distance_km,
    longest_run_km
)
SELECT
    year,
    month_number,
    MAX(month_label)                                AS month_label,
    COUNT(*)                                        AS total_runs,
    ROUND(SUM(distance_km), 2)                      AS total_distance_km,
    ROUND(SUM(distance_miles), 2)                   AS total_distance_miles,
    ROUND(SUM(moving_time_minutes), 2)              AS total_moving_time_minutes,
    ROUND(SUM(moving_time_minutes) / 60.0, 2)       AS total_moving_time_hours,
    ROUND(AVG(avg_pace_min_per_km), 2)              AS avg_pace_min_per_km,
    ROUND(AVG(avg_pace_min_per_mile), 2)            AS avg_pace_min_per_mile,
    ROUND(AVG(avg_hr), 1)                           AS avg_hr,
    SUM(calories)                                   AS total_calories,
    SUM(total_ascent)                               AS total_ascent,
    ROUND(AVG(distance_km), 2)                      AS avg_distance_km,
    MAX(distance_km)                                AS longest_run_km
FROM marts.run_summary
GROUP BY year, month_number
ORDER BY year, month_number;
