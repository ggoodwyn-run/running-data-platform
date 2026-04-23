'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { TrainingLoad } from '@/lib/types'

export function WoWChart({ data }: { data: TrainingLoad[] }) {
  const chartData = data
    .filter((d) => d.km_wow_pct_change != null)
    .map((d) => ({
      date: String(d.date).slice(0, 10),
      wow:  Number(d.km_wow_pct_change),
    }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} unit="%" width={40} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, 'WoW change']} />
        <ReferenceLine y={0} stroke="#d1d5db" />
        <Area
          type="monotone"
          dataKey="wow"
          stroke="#10b981"
          fill="#d1fae5"
          connectNulls
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
