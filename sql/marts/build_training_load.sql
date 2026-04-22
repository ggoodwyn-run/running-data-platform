-- ============================================================
-- Build: marts.training_load
-- Rolling training load analytics. Source: marts.run_summary.
--
-- Run order: must come AFTER build_marts.sql (needs run_summary).
-- Safe to re-run at any time — always a full rebuild.
-- ============================================================
TRUNCATE TABLE marts.training_load;

WITH

-- -------------------------------------------------------
-- Step 1: Aggregate to one row per calendar day.
-- Handles the case where you run twice in a day.
-- -------------------------------------------------------
daily_runs AS (
    SELECT
        date_of_activity                                                        AS run_date,
        COUNT(*)::integer                                                       AS runs_on_day,
        ROUND(SUM(distance_km), 2)                                              AS daily_distance_km,
        ROUND(SUM(moving_time_minutes), 2)                                      AS daily_moving_time_min,
        ROUND(AVG(avg_hr))::integer                                             AS daily_avg_hr,
        -- Load score proxy: time × normalised HR.
        -- Null HR defaults to 150 bpm so rest days stay at 0.
        ROUND(SUM(moving_time_minutes * COALESCE(avg_hr, 150) / 100.0), 2)     AS daily_load_score
    FROM marts.run_summary
    GROUP BY date_of_activity
),

-- -------------------------------------------------------
-- Step 2: Date spine — every calendar day from your first
-- run to today, so rest days appear as zero-load rows.
-- Without this, rolling averages would span fewer days
-- than intended and inflate ATL/CTL.
-- -------------------------------------------------------
date_spine AS (
    SELECT generate_series(
        (SELECT MIN(run_date) FROM daily_runs),
        CURRENT_DATE,
        '1 day'::interval
    )::date AS date
),

spine_with_runs AS (
    SELECT
        s.date,
        COALESCE(d.runs_on_day, 0)              AS runs_on_day,
        COALESCE(d.daily_distance_km, 0)        AS daily_distance_km,
        COALESCE(d.daily_moving_time_min, 0)    AS daily_moving_time_min,
        d.daily_avg_hr,
        COALESCE(d.daily_load_score, 0)         AS daily_load_score
    FROM date_spine s
    LEFT JOIN daily_runs d ON d.run_date = s.date
),

-- -------------------------------------------------------
-- Step 3: Rolling windows.
-- ROWS BETWEEN is used (not RANGE) because every date is
-- unique, so row-based and range-based frames are equal,
-- but ROWS is clearer about intent.
-- -------------------------------------------------------
rolling AS (
    SELECT
        *,
        -- ATL: average load over the last 7 days (how hard you've been working lately)
        ROUND(AVG(daily_load_score) OVER w7,  2)    AS atl_7d,
        -- CTL: average load over the last 42 days (your long-term fitness baseline)
        ROUND(AVG(daily_load_score) OVER w42, 2)    AS ctl_42d,
        -- Mileage rolling windows
        ROUND(SUM(daily_distance_km) OVER w7,  2)   AS km_7d_rolling,
        ROUND(SUM(daily_distance_km) OVER w28, 2)   AS km_28d_rolling,
        -- Previous 7-day window (rows 7–13 days ago) used for WoW comparison
        ROUND(SUM(daily_distance_km) OVER (
            ORDER BY date
            ROWS BETWEEN 13 PRECEDING AND 7 PRECEDING
        ), 2)                                        AS km_prev_7d
    FROM spine_with_runs
    WINDOW
        w7  AS (ORDER BY date ROWS BETWEEN  6 PRECEDING AND CURRENT ROW),
        w28 AS (ORDER BY date ROWS BETWEEN 27 PRECEDING AND CURRENT ROW),
        w42 AS (ORDER BY date ROWS BETWEEN 41 PRECEDING AND CURRENT ROW)
),

-- -------------------------------------------------------
-- Step 4: Derive TSB and week-over-week % change.
-- -------------------------------------------------------
with_derived AS (
    SELECT
        *,
        -- TSB = CTL - ATL. Positive means rested; deeply negative means fatigued.
        ROUND(ctl_42d - atl_7d, 2)  AS tsb,
        ROUND(
            CASE
                WHEN COALESCE(km_prev_7d, 0) = 0 THEN NULL  -- can't compute WoW with no prior data
                ELSE (km_7d_rolling - km_prev_7d) / km_prev_7d * 100
            END
        , 1)                         AS km_wow_pct_change
    FROM rolling
),

-- -------------------------------------------------------
-- Step 5: Run streak.
-- Strategy: the cumulative count of rest days (grp) acts as
-- a group key — all days in one unbroken run block share the
-- same grp value. ROW_NUMBER within each group gives the
-- streak length. We subtract 1 for grp > 0 because each new
-- group begins with the rest day that ended the previous streak.
-- -------------------------------------------------------
streak_grps AS (
    SELECT
        date,
        runs_on_day,
        SUM(CASE WHEN runs_on_day = 0 THEN 1 ELSE 0 END)
            OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS grp
    FROM spine_with_runs
),

streak AS (
    SELECT
        date,
        CASE
            WHEN runs_on_day = 0 THEN 0
            ELSE (
                ROW_NUMBER() OVER (PARTITION BY grp ORDER BY date)
                - CASE WHEN grp > 0 THEN 1 ELSE 0 END  -- offset for the rest day that opens each group
            )::integer
        END AS run_streak
    FROM streak_grps
)

-- -------------------------------------------------------
-- Final insert
-- -------------------------------------------------------
INSERT INTO marts.training_load (
    date,
    runs_on_day,
    daily_distance_km,
    daily_moving_time_min,
    daily_avg_hr,
    daily_load_score,
    atl_7d,
    ctl_42d,
    tsb,
    km_7d_rolling,
    km_28d_rolling,
    km_prev_7d,
    km_wow_pct_change,
    run_streak
)
SELECT
    d.date,
    d.runs_on_day,
    d.daily_distance_km,
    d.daily_moving_time_min,
    d.daily_avg_hr,
    d.daily_load_score,
    d.atl_7d,
    d.ctl_42d,
    d.tsb,
    d.km_7d_rolling,
    d.km_28d_rolling,
    d.km_prev_7d,
    d.km_wow_pct_change,
    s.run_streak
FROM with_derived d
JOIN streak s ON s.date = d.date
ORDER BY d.date;
