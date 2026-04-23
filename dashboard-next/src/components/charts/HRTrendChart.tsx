'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { fmtDate } from '@/lib/formatters'
import type { RunSummary } from '@/lib/types'

interface TooltipPayload {
  payload?: RunSummary
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length || !payload[0].payload) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{fmtDate(d.date_of_activity)}</p>
      <p>{d.title ?? 'Run'}</p>
      <p className="text-red-500">{d.avg_hr} bpm &middot; {d.effort_zone}</p>
    </div>
  )
}

export function HRTrendChart({ runs }: { runs: RunSummary[] }) {
  const data = runs.filter((r) => r.avg_hr != null).map((r) => ({ ...r, date_of_activity: String(r.date_of_activity).slice(0, 10) }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date_of_activity" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} unit=" bpm" width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="avg_hr" stroke="#ef4444" dot={{ r: 3, fill: '#ef4444' }} strokeWidth={2} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
