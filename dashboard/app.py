import os
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Running Analytics",
    page_icon="🏃",
    layout="wide",
)

# ── DB connection ──────────────────────────────────────────────────────────────
# st.cache_resource caches the engine for the lifetime of the app session —
# one connection pool shared across all reruns, not a new one every interaction.
@st.cache_resource
def get_engine():
    url = URL.create(
        drivername="postgresql+psycopg2",
        username=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "Mp1Z4cD@7"),
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "5432")),
        database=os.environ.get("DB_NAME", "postgres"),
    )
    return create_engine(url, future=True)


# ── Data loaders ───────────────────────────────────────────────────────────────
# st.cache_data caches the DataFrame for ttl seconds (5 min here).
# Streamlit re-runs the whole script on every interaction, so without this
# every button click would re-query the database.
@st.cache_data(ttl=300)
def load_run_summary() -> pd.DataFrame:
    with get_engine().connect() as conn:
        return pd.read_sql(
            text("SELECT * FROM marts.run_summary ORDER BY date_of_activity"),
            conn,
        )

@st.cache_data(ttl=300)
def load_monthly_stats() -> pd.DataFrame:
    with get_engine().connect() as conn:
        df = pd.read_sql(
            text("SELECT * FROM marts.monthly_stats ORDER BY year, month_number"),
            conn,
        )
    # Build a proper date column so Plotly sorts the x-axis chronologically
    # rather than alphabetically on the month_label string.
    df["month_date"] = pd.to_datetime(
        df["year"].astype(str) + "-" + df["month_number"].astype(str).str.zfill(2) + "-01"
    )
    return df

@st.cache_data(ttl=300)
def load_training_load() -> pd.DataFrame:
    with get_engine().connect() as conn:
        return pd.read_sql(
            text("SELECT * FROM marts.training_load ORDER BY date"),
            conn,
        )


# ── Helpers ────────────────────────────────────────────────────────────────────
def fmt_pace(val) -> str:
    """Convert decimal minutes (7.75) to MM:SS display string ('7:45')."""
    if pd.isna(val):
        return "—"
    m = int(val)
    s = round((val - m) * 60)
    return f"{m}:{s:02d}"


# ── Load data ──────────────────────────────────────────────────────────────────
runs    = load_run_summary()
monthly = load_monthly_stats()
tl      = load_training_load()


# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Filters")

    min_date = runs["date_of_activity"].min().date()
    max_date = runs["date_of_activity"].max().date()

    date_range = st.date_input(
        "Date range",
        value=(min_date, max_date),
        min_value=min_date,
        max_value=max_date,
    )

    st.divider()
    st.caption("Data sourced from Garmin Connect exports via a local PostgreSQL pipeline.")

# Apply date filter to per-run data.
# Monthly and training-load charts always show the full history —
# aggregates lose meaning when partially sliced mid-month.
if len(date_range) == 2:
    start, end = pd.Timestamp(date_range[0]), pd.Timestamp(date_range[1])
    runs_view = runs[
        (runs["date_of_activity"] >= start) &
        (runs["date_of_activity"] <= end)
    ]
else:
    runs_view = runs


# ── Header ─────────────────────────────────────────────────────────────────────
st.title("🏃 Running Analytics")
last_run = runs_view["date_of_activity"].max()
st.caption(
    f"Last run: {last_run.strftime('%b %d, %Y')}  ·  "
    f"{len(runs_view)} runs in selected range"
)


# ── Key metrics ────────────────────────────────────────────────────────────────
c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Total Runs",    f"{len(runs_view)}")
c2.metric("Total Distance", f"{runs_view['distance_km'].sum():.1f} km")
c3.metric("Total Miles",   f"{runs_view['distance_miles'].sum():.1f} mi")
c4.metric("Total Time",    f"{runs_view['moving_time_hours'].sum():.1f} hrs")
c5.metric("Avg Pace",      fmt_pace(runs_view["avg_pace_min_per_km"].mean()) + " /km")

st.divider()


# ── Monthly mileage ─────────────────────────────────────────────────────────────
st.subheader("Monthly Mileage")

fig_monthly = px.bar(
    monthly,
    x="month_date",
    y="total_distance_km",
    text="total_runs",
    hover_data={
        "month_label": True,
        "month_date": False,
        "total_distance_km": ":.1f",
        "total_runs": True,
        "avg_pace_min_per_km": ":.2f",
    },
    labels={
        "month_date": "",
        "total_distance_km": "Distance (km)",
        "total_runs": "Runs",
    },
    color_discrete_sequence=["#4C78A8"],
)
fig_monthly.update_traces(
    texttemplate="%{text} run(s)",
    textposition="outside",
)
fig_monthly.update_xaxes(dtick="M1", tickformat="%b %Y")
fig_monthly.update_layout(showlegend=False, margin=dict(t=30, b=0))
st.plotly_chart(fig_monthly, use_container_width=True)

st.divider()


# ── Training load (ATL / CTL / TSB) ────────────────────────────────────────────
st.subheader("Training Load")
st.caption(
    "**CTL** (blue) = 42-day rolling avg load — your fitness baseline.  "
    "**ATL** (orange) = 7-day rolling avg load — recent fatigue.  "
    "**TSB** (green dashed) = CTL − ATL — positive means rested, negative means fatigued."
)

fig_tl = go.Figure()

fig_tl.add_trace(go.Scatter(
    x=tl["date"], y=tl["ctl_42d"],
    name="CTL — Fitness",
    line=dict(color="#4C78A8", width=2.5),
    fill="tozeroy",
    fillcolor="rgba(76, 120, 168, 0.08)",
))
fig_tl.add_trace(go.Scatter(
    x=tl["date"], y=tl["atl_7d"],
    name="ATL — Fatigue",
    line=dict(color="#F58518", width=2),
))
fig_tl.add_trace(go.Scatter(
    x=tl["date"], y=tl["tsb"],
    name="TSB — Form",
    line=dict(color="#54A24B", width=1.5, dash="dot"),
))
fig_tl.add_hline(y=0, line_color="gray", line_dash="dash", line_width=1, opacity=0.5)
fig_tl.update_layout(
    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
    margin=dict(t=10, b=0),
    yaxis_title="Load Score",
    xaxis_title="",
    hovermode="x unified",
)
st.plotly_chart(fig_tl, use_container_width=True)

st.divider()


# ── Pace & HR trends ────────────────────────────────────────────────────────────
st.subheader("Performance Trends")
col_pace, col_hr = st.columns(2)

with col_pace:
    st.markdown("**Avg Pace per Run** *(lower = faster — y-axis inverted)*")
    pace_df = runs_view.dropna(subset=["avg_pace_min_per_km"]).copy()
    pace_df["pace_fmt"] = pace_df["avg_pace_min_per_km"].apply(fmt_pace)

    # Build custom y-axis tick labels in MM:SS so the axis reads naturally
    p_min = pace_df["avg_pace_min_per_km"].min()
    p_max = pace_df["avg_pace_min_per_km"].max()
    tick_vals = [round(v * 4) / 4 for v in
                 pd.Series(range(int(p_min * 4), int(p_max * 4) + 2)).div(4)]
    tick_text = [fmt_pace(v) for v in tick_vals]

    fig_pace = px.line(
        pace_df,
        x="date_of_activity",
        y="avg_pace_min_per_km",
        markers=True,
        custom_data=["pace_fmt", "title", "distance_km"],
        labels={"date_of_activity": "", "avg_pace_min_per_km": "Pace"},
        color_discrete_sequence=["#4C78A8"],
    )
    fig_pace.update_traces(
        hovertemplate="<b>%{customdata[1]}</b><br>Pace: %{customdata[0]} /km<br>Distance: %{customdata[2]:.1f} km<extra></extra>"
    )
    fig_pace.update_yaxes(
        autorange="reversed",
        tickvals=tick_vals,
        ticktext=tick_text,
    )
    fig_pace.update_layout(margin=dict(t=10, b=0))
    st.plotly_chart(fig_pace, use_container_width=True)

with col_hr:
    st.markdown("**Avg Heart Rate per Run**")
    hr_df = runs_view.dropna(subset=["avg_hr"])

    fig_hr = px.line(
        hr_df,
        x="date_of_activity",
        y="avg_hr",
        markers=True,
        custom_data=["title", "distance_km", "effort_zone"],
        labels={"date_of_activity": "", "avg_hr": "Avg HR (bpm)"},
        color_discrete_sequence=["#E45756"],
    )
    fig_hr.update_traces(
        hovertemplate="<b>%{customdata[0]}</b><br>Avg HR: %{y} bpm<br>Zone: %{customdata[2]}<extra></extra>"
    )
    fig_hr.update_layout(margin=dict(t=10, b=0))
    st.plotly_chart(fig_hr, use_container_width=True)

st.divider()


# ── Effort zone breakdown & recent runs ─────────────────────────────────────────
st.subheader("Effort Zones & Recent Runs")
col_zone, col_table = st.columns([1, 2])

ZONE_ORDER  = ["Easy", "Moderate", "Hard", "Max Effort", "Unknown"]
ZONE_COLORS = {
    "Easy":       "#54A24B",
    "Moderate":   "#F5C518",
    "Hard":       "#F58518",
    "Max Effort": "#E45756",
    "Unknown":    "#AAAAAA",
}

with col_zone:
    zone_counts = (
        runs_view["effort_zone"]
        .value_counts()
        .reindex(ZONE_ORDER)
        .dropna()
        .reset_index()
    )
    zone_counts.columns = ["effort_zone", "count"]

    fig_zone = px.bar(
        zone_counts,
        x="count",
        y="effort_zone",
        orientation="h",
        color="effort_zone",
        color_discrete_map=ZONE_COLORS,
        text="count",
        labels={"count": "Runs", "effort_zone": ""},
    )
    fig_zone.update_traces(textposition="outside")
    fig_zone.update_layout(
        showlegend=False,
        margin=dict(t=10, b=0),
        yaxis=dict(categoryorder="array", categoryarray=list(reversed(ZONE_ORDER))),
    )
    st.plotly_chart(fig_zone, use_container_width=True)

with col_table:
    st.markdown("**Last 10 Runs**")
    recent = (
        runs_view
        .sort_values("date_of_activity", ascending=False)
        .head(10)
        [[
            "date_of_activity", "title", "distance_km",
            "moving_time_hours", "avg_pace_min_per_km", "avg_hr", "effort_zone",
        ]]
        .rename(columns={
            "date_of_activity":    "Date",
            "title":               "Title",
            "distance_km":         "KM",
            "moving_time_hours":   "Hours",
            "avg_pace_min_per_km": "Pace /km",
            "avg_hr":              "Avg HR",
            "effort_zone":         "Zone",
        })
    )
    recent["Date"]     = recent["Date"].dt.strftime("%b %d, %Y")
    recent["Pace /km"] = recent["Pace /km"].apply(fmt_pace)
    recent["KM"]       = recent["KM"].apply(lambda x: f"{x:.2f}")
    recent["Hours"]    = recent["Hours"].apply(lambda x: f"{x:.2f}")

    st.dataframe(recent, hide_index=True, use_container_width=True)
