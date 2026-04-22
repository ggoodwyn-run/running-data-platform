CREATE TABLE IF NOT EXISTS marts.training_load (
    -- One row per calendar day from your first run to today.
    -- Rest days are included (with 0s) so rolling windows stay honest.
    date                    DATE PRIMARY KEY,

    -- Raw daily values (aggregated if multiple runs on the same day)
    runs_on_day             INTEGER      NOT NULL DEFAULT 0,
    daily_distance_km       NUMERIC(10,2) NOT NULL DEFAULT 0,
    daily_moving_time_min   NUMERIC      NOT NULL DEFAULT 0,
    daily_avg_hr            INTEGER,
    -- Load score = moving_time_min × (avg_hr / 100).
    -- Roughly: a 45-min run at 150 bpm = 67.5 load units.
    -- Null HR falls back to 150 bpm so rest days still score 0.
    daily_load_score        NUMERIC(10,2) NOT NULL DEFAULT 0,

    -- ATL/CTL model (same concept used by TrainingPeaks / Garmin Connect)
    atl_7d                  NUMERIC(10,2), -- Acute Training Load:   7-day rolling avg load score
    ctl_42d                 NUMERIC(10,2), -- Chronic Training Load: 42-day rolling avg load score
    tsb                     NUMERIC(10,2), -- Training Stress Balance: CTL - ATL
                                           --   > 0  → fresh/rested
                                           --   < 0  → accumulated fatigue
                                           --   < -30 → overtraining risk zone

    -- Rolling mileage windows
    km_7d_rolling           NUMERIC(10,2), -- Total km in the last 7 days
    km_28d_rolling          NUMERIC(10,2), -- Total km in the last 28 days
    km_prev_7d              NUMERIC(10,2), -- Total km in the 7 days before that (for WoW)
    km_wow_pct_change       NUMERIC(10,2), -- Week-over-week % mileage change

    -- Streak
    run_streak              INTEGER      NOT NULL DEFAULT 0, -- Consecutive days with ≥1 run ending on this date

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
