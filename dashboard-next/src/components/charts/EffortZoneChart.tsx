'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell,
} from 'recharts'
import type { RunSummary } from '@/lib/types'

const ZONE_COLORS: Record<string, string> = {
  Easy:         '#22c55e',
  Moderate:     '#eab308',
  Hard:         '#f97316',
  'Max Effort': '#ef4444',
  Unknown:      '#9ca3af',
}

const ZONE_ORDER = ['Easy', 'Moderate', 'Hard', 'Max Effort', 'Unknown']

export function EffortZoneChart({ runs }: { runs: RunSummary[] }) {
  const counts: Record<string, number> = {}
  for (const r of runs) {
    counts[r.effort_zone] = (counts[r.effort_zone] ?? 0) + 1
  }

  const data = ZONE_ORDER
    .filter((z) => counts[z])
    .map((zone) => ({ zone, count: counts[zone] }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="zone" tick={{ fontSize: 12, fill: '#374151' }} tickLine={false} axisLine={false} width={72} />
        <Tooltip formatter={(v) => [`${v} runs`, 'Count']} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: '#6b7280' }} />
          {data.map((entry) => (
            <Cell key={entry.zone} fill={ZONE_COLORS[entry.zone] ?? '#9ca3af'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
