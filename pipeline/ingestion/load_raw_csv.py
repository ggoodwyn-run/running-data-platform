from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import MetaData, Table, create_engine
from sqlalchemy.dialects.postgresql import insert

# ----------------------------
# Configuration
# ----------------------------

DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/running-platform-db"
CSV_PATH = "data/garmin_activities.csv"
RAW_SCHEMA = "raw_data"
RAW_TABLE_NAME = "runs_raw"

# Map normalized source columns -> target database columns
COLUMN_MAPPING = {
    "activity_id": "activity_id",
    "date": "activity_date",
    "activity_name": "activity_name",
    "activity_type": "activity_type",
    "distance": "distance",
    "avg_hr": "avg_hr",
    "max_hr": "max_hr",
    "avg_pace": "avg_pace",
    "calories": "calories",
    "elevation_gain": "elevation_gain_ft",
}

# Garmin field that comes in as HH:MM:SS and will become numeric duration fields
MOVING_TIME_SOURCE_COLUMN = "moving_time"

REQUIRED_SOURCE_COLUMNS = set(COLUMN_MAPPING.keys()) | {MOVING_TIME_SOURCE_COLUMN}

TARGET_COLUMNS = [
    "activity_id",
    "activity_date",
    "activity_name",
    "activity_type",
    "distance_miles",
    "duration_seconds",
    "duration_minutes",
    "avg_hr",
    "max_hr",
    "avg_pace_min_per_mile",
    "calories",
    "elevation_gain_ft",
    "source_file",
    "record_hash",
]


# ----------------------------
# Helpers
# ----------------------------

def normalize_column_name(col: str) -> str:
    """
    Normalize source column names so they are easier to map reliably.
    Example:
        'Activity ID' -> 'activity_id'
        'Avg. HR' -> 'avg_hr'
        'Moving Time' -> 'moving_time'
    """
    return (
        col.strip()
        .lower()
        .replace(".", "")
        .replace("/", "_")
        .replace(" ", "_")
    )


def build_record_hash(row: pd.Series) -> str:
    """
    Create a deterministic hash for traceability / change detection.
    Uses stable business fields from the source record.
    """
    parts = [
        str(row.get("activity_id", "")),
        str(row.get("activity_date", "")),
        str(row.get("activity_name", "")),
        str(row.get("distance_miles", "")),
        str(row.get("duration_seconds", "")),
    ]
    raw_string = "|".join(parts)
    return hashlib.sha256(raw_string.encode("utf-8")).hexdigest()


def validate_required_columns(df: pd.DataFrame) -> None:
    actual_columns = set(df.columns)
    missing = REQUIRED_SOURCE_COLUMNS - actual_columns
    if missing:
        raise ValueError(
            f"Missing expected source columns: {sorted(missing)}. "
            f"Actual columns found: {sorted(actual_columns)}"
        )


def convert_moving_time(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converts HH:MM:SS moving_time into duration_seconds and duration_minutes.
    """
    td = pd.to_timedelta(df[MOVING_TIME_SOURCE_COLUMN], errors="coerce")

    df["duration_seconds"] = td.dt.total_seconds()
    df["duration_minutes"] = (df["duration_seconds"] / 60).round(2)

    return df


def convert_types(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert source values into clean warehouse-friendly types.
    """
    df["activity_id"] = pd.to_numeric(df["activity_id"], errors="coerce").astype("Int64")
    df["activity_date"] = pd.to_datetime(df["activity_date"], errors="coerce")

    numeric_columns = [
        "distance_miles",
        "duration_seconds",
        "duration_minutes",
        "avg_hr",
        "max_hr",
        "avg_pace_min_per_mile",
        "calories",
        "elevation_gain_ft",
    ]

    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def prepare_dataframe(csv_path: str) -> pd.DataFrame:
    """
    Read source CSV and return a dataframe aligned to the raw table schema.
    """
    print(f"Reading source file: {csv_path}")
    df = pd.read_csv(csv_path)

    print("Original columns:")
    print(df.columns.tolist())

    # Normalize headers first
    df.columns = [normalize_column_name(c) for c in df.columns]

    print("Normalized columns:")
    print(df.columns.tolist())

    # Validate that the required columns exist before doing anything else
    validate_required_columns(df)

    # Map source columns to warehouse columns
    df = df.rename(columns=COLUMN_MAPPING)

    # Convert moving time separately
    df = convert_moving_time(df)

    # Keep only mapped/target columns plus source-derived metadata later
    keep_columns = list(COLUMN_MAPPING.values()) + ["duration_seconds", "duration_minutes"]
    df = df[keep_columns].copy()

    # Convert types
    df = convert_types(df)

    # Add metadata fields
    df["source_file"] = Path(csv_path).name
    df["record_hash"] = df.apply(build_record_hash, axis=1)

    # Reorder to match the target raw table
    df = df[TARGET_COLUMNS]

    # Optional: drop rows with null activity_id because that's your business key
    before_drop = len(df)
    df = df.dropna(subset=["activity_id"]).copy()
    after_drop = len(df)

    if before_drop != after_drop:
        print(f"Dropped {before_drop - after_drop} rows due to null activity_id")

    # Convert pandas nullable integer to plain Python int where possible
    df["activity_id"] = df["activity_id"].astype("int64")

    print(f"Prepared {len(df)} rows for loading")
    print("Preview:")
    print(df.head())

    return df


def upsert_raw_runs(df: pd.DataFrame) -> None:
    """
    Upsert rows into raw.runs_raw using activity_id as the business key.
    """
    engine = create_engine(DATABASE_URL, future=True)
    metadata = MetaData(schema=RAW_SCHEMA)
    runs_raw = Table(RAW_TABLE_NAME, metadata, autoload_with=engine)

    rows = df.to_dict(orient="records")

    if not rows:
        print("No rows to load.")
        return

    with engine.begin() as conn:
        for row in rows:
            stmt = insert(runs_raw).values(**row)
            stmt = stmt.on_conflict_do_update(
                index_elements=["activity_id"],
                set_={
                    "activity_date": stmt.excluded.activity_date,
                    "activity_name": stmt.excluded.activity_name,
                    "activity_type": stmt.excluded.activity_type,
                    "distance_miles": stmt.excluded.distance_miles,
                    "duration_seconds": stmt.excluded.duration_seconds,
                    "duration_minutes": stmt.excluded.duration_minutes,
                    "avg_hr": stmt.excluded.avg_hr,
                    "max_hr": stmt.excluded.max_hr,
                    "avg_pace_min_per_mile": stmt.excluded.avg_pace_min_per_mile,
                    "calories": stmt.excluded.calories,
                    "elevation_gain_ft": stmt.excluded.elevation_gain_ft,
                    "source_file": stmt.excluded.source_file,
                    "record_hash": stmt.excluded.record_hash,
                },
            )
            conn.execute(stmt)

    print(f"Upserted {len(rows)} rows into {RAW_SCHEMA}.{RAW_TABLE_NAME}")


def main() -> None:
    df = prepare_dataframe(CSV_PATH)
    upsert_raw_runs(df)
    print("Raw load complete.")


if __name__ == "__main__":
    main()