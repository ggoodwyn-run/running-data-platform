# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A personal data pipeline for Garmin running data. Garmin exports are loaded from CSV into a local PostgreSQL database, then transformed through layered SQL schemas (raw → staging → marts).

## Running the pipeline

```bash
source .venv/bin/activate
python pipeline/run_pipeline.py          # runs all four steps + quality checks
python pipeline/quality_checks.py        # quality checks only (standalone)
streamlit run dashboard/app.py           # launch the analytics dashboard
```

Individual steps can still be run in isolation:
- Raw load only: `python pipeline/ingestion/load_raw_csv.py`
- SQL steps: execute the relevant `.sql` file in psql or SQLTools

## Database setup (first time)

Run these SQL files in order against the local PostgreSQL instance (`localhost:5432`, database `postgres`, user `postgres`):

1. `sql/schema/create_schema.sql` — creates the `raw_data`, `staging`, and `marts` schemas
2. `sql/raw/raw_data.sql` — creates `raw_data.runs_raw`
3. `sql/staging/run_clean.sql` — creates `staging.runs_clean` (uses `DROP TABLE IF EXISTS` so safe to re-run when schema changes)
4. `sql/marts/run_summary.sql` — creates `marts.run_summary`
5. `sql/marts/monthly_stats.sql` — creates `marts.monthly_stats`
6. `sql/marts/training_load.sql` — creates `marts.training_load`

## Architecture

```
data/Activities.csv                  ← Garmin export (source of truth)
        │
        ▼
pipeline/ingestion/load_raw_csv.py
        │  normalizes headers, converts time/pace to decimal minutes,
        │  computes record_hash, upserts via SQLAlchemy
        ▼
raw_data.runs_raw                    ← verbatim source data, append-friendly
        │                              record_hash is the upsert conflict key
        ▼
sql/staging/build_run_clean.sql
        │  filters to Running only, casts date, derives week_start /
        │  month_start / year / month_number / day_of_week
        ▼
staging.runs_clean                   ← cleaned, typed, date-dimensioned
        │                              rebuilt from scratch on each run (TRUNCATE + INSERT)
        ▼
sql/marts/build_marts.sql
        │  adds distance_miles, pace_min_per_mile, moving_time_hours,
        │  effort_zone; rolls up to monthly aggregates
        ▼
marts.run_summary                    ← one enriched row per run
marts.monthly_stats                  ← monthly rollup (total mileage, avg pace, etc.)
        │
        ▼
sql/marts/build_training_load.sql
        │  generates date spine, computes rolling ATL/CTL/TSB,
        │  rolling mileage windows, WoW % change, run streak
        ▼
marts.training_load                  ← one row per calendar day (rest days included),
                                       rolling training load analytics
```

**Key design decisions:**
- `record_hash` (SHA-256 of date + title + distance + moving_time_minutes) is the upsert conflict key — re-running the ingestion script is idempotent
- `avg_pace` is stored as decimal minutes per km (e.g. `7:45` → `7.75`); mart adds the per-mile equivalent
- `moving_time` and `elapsed_time` are both converted from `HH:MM:SS` to decimal minutes
- `avg_stride_length` is `NUMERIC(5,2)` — Garmin reports in meters (e.g. `1.32`), not integers
- Staging filters `WHERE activity_type = 'Running'` so other Garmin activities are safely ignored
- `effort_zone` in `run_summary` uses generic HR thresholds (Easy <140, Moderate 140–155, Hard 156–169, Max Effort 170+) — adjust to your own zones
- `training_load` uses a date spine (`generate_series`) so rest days fill in as zero-load rows; without this, rolling windows would span too few calendar days and overstate ATL/CTL
- ATL/CTL load score = `moving_time_minutes × (avg_hr / 100)`; TSB = CTL − ATL (positive = fresh, negative = fatigued, below −30 = overtraining risk)
- `build_training_load.sql` must run after `build_marts.sql` — it reads from `marts.run_summary`

## Dependencies

Python packages (installed in `.venv`): `pandas`, `sqlalchemy`, `psycopg2-binary`, `python-dateutil`, `streamlit`, `plotly`

```bash
pip install pandas sqlalchemy psycopg2-binary python-dateutil streamlit plotly
```

## Configuration via environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DB_USER` | `postgres` | DB username |
| `DB_PASSWORD` | *(hardcoded fallback)* | DB password — prefer setting this as an env var |
| `DB_HOST` | `localhost` | DB host |
| `DB_PORT` | `5432` | DB port |
| `DB_NAME` | `postgres` | Database name |
| `ACTIVITIES_CSV_PATH` | `data/Activities.csv` relative to repo root | Path to Garmin export |
