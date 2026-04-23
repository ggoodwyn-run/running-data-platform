'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { TrainingLoad } from '@/lib/types'

export function RollingMileageChart({ data }: { data: TrainingLoad[] }) {
  const chartData = data.map((d) => ({
    date:   String(d.date).slice(0, 10),
    daily:  Number(d.daily_distance_km) || 0,
    r7:     d.km_7d_rolling  != null ? Number(d.km_7d_rolling)  : null,
    r28:    d.km_28d_rolling != null ? Number(d.km_28d_rolling) : null,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} unit=" km" width={50} />
        <Tooltip formatter={(v) => [`${Number(v).toFixed(1)} km`]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="daily" name="Daily km" fill="#bfdbfe" radius={[2, 2, 0, 0]} />
        <Line type="monotone" dataKey="r7"  name="7-day rolling"  stroke="#3b82f6" dot={false} strokeWidth={2} connectNulls />
        <Line type="monotone" dataKey="r28" name="28-day rolling" stroke="#8b5cf6" dot={false} strokeWidth={2} strokeDasharray="5 3" connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
