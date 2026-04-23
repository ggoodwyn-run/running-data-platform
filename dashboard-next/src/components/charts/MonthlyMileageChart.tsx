'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from 'recharts'
import type { MonthlyStats } from '@/lib/types'
import { fmtPace } from '@/lib/formatters'

interface TooltipPayload {
  payload?: {
    month_label: string
    total_distance_km: number
    total_runs: number
    avg_pace_min_per_km: number | null
  }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length || !payload[0].payload) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{d.month_label}</p>
      <p>{Number(d.total_distance_km).toFixed(1)} km &middot; {d.total_runs} runs</p>
      {d.avg_pace_min_per_km && <p className="text-gray-500">Avg pace {fmtPace(d.avg_pace_min_per_km)} /km</p>}
    </div>
  )
}

export function MonthlyMileageChart({ data }: { data: MonthlyStats[] }) {
  const chartData = data.map((m) => ({
    ...m,
    total_distance_km: Number(m.total_distance_km),
    month_date: `${m.year}-${String(m.month_number).padStart(2, '0')}`,
  })).sort((a, b) => a.month_date.localeCompare(b.month_date))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="month_label" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} unit=" km" width={55} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total_distance_km" fill="#3b82f6" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="total_runs"
            position="top"
            style={{ fontSize: 11, fill: '#6b7280' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => `${v}×`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
