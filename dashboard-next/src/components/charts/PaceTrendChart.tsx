'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fmtPace, fmtDate } from '@/lib/formatters'
import type { RunSummary } from '@/lib/types'

interface TooltipPayload {
  payload?: RunSummary & { pace_neg: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length || !payload[0].payload) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{fmtDate(d.date_of_activity)}</p>
      <p>{d.title ?? 'Run'}</p>
      <p className="text-blue-600">{fmtPace(d.avg_pace_min_per_km)} /km &middot; {Number(d.distance_km).toFixed(1)} km</p>
    </div>
  )
}

export function PaceTrendChart({ runs }: { runs: RunSummary[] }) {
  const data = runs
    .filter((r) => r.avg_pace_min_per_km != null)
    .map((r) => ({ ...r, date_of_activity: String(r.date_of_activity).slice(0, 10), pace_neg: -(Number(r.avg_pace_min_per_km)) }))

  const paceValues = data.map((d) => d.pace_neg)
  const domain: [number, number] = [Math.min(...paceValues) - 0.5, Math.max(...paceValues) + 0.5]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date_of_activity" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis
          domain={domain}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => fmtPace(-v)}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="pace_neg" stroke="#3b82f6" dot={{ r: 3, fill: '#3b82f6' }} strokeWidth={2} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
