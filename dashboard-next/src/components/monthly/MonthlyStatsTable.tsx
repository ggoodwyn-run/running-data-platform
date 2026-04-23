'use client'

import { fmtPace, fmtDuration } from '@/lib/formatters'
import type { MonthlyStats } from '@/lib/types'

export function MonthlyStatsTable({ data }: { data: MonthlyStats[] }) {
  const sorted = [...data].reverse()

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3 text-left">Month</th>
            <th className="px-4 py-3 text-right">Runs</th>
            <th className="px-4 py-3 text-right">Total km</th>
            <th className="px-4 py-3 text-right">Total mi</th>
            <th className="px-4 py-3 text-right">Total Time</th>
            <th className="px-4 py-3 text-right">Avg Pace /km</th>
            <th className="px-4 py-3 text-right">Avg HR</th>
            <th className="px-4 py-3 text-right">Calories</th>
            <th className="px-4 py-3 text-right">Ascent</th>
            <th className="px-4 py-3 text-right">Avg Run</th>
            <th className="px-4 py-3 text-right">Longest</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={`${m.year}-${m.month_number}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{m.month_label}</td>
              <td className="px-4 py-3 text-right tabular-nums">{m.total_runs}</td>
              <td className="px-4 py-3 text-right tabular-nums">{Number(m.total_distance_km).toFixed(1)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{Number(m.total_distance_miles).toFixed(1)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtDuration(m.total_moving_time_hours)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{fmtPace(m.avg_pace_min_per_km)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{m.avg_hr != null ? Number(m.avg_hr).toFixed(0) : '—'}</td>
              <td className="px-4 py-3 text-right tabular-nums">{m.total_calories ?? '—'}</td>
              <td className="px-4 py-3 text-right tabular-nums">{m.total_ascent != null ? `${m.total_ascent} m` : '—'}</td>
              <td className="px-4 py-3 text-right tabular-nums">{Number(m.avg_distance_km).toFixed(1)} km</td>
              <td className="px-4 py-3 text-right tabular-nums">{Number(m.longest_run_km).toFixed(1)} km</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
