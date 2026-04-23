'use client'

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend,
} from 'recharts'
import type { TrainingLoad } from '@/lib/types'

interface TooltipPayload {
  name?: string
  value?: number
  color?: string
}

function CustomTooltip({ active, label, payload }: { active?: boolean; label?: string; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value != null ? Number(p.value).toFixed(1) : '—'}
        </p>
      ))}
    </div>
  )
}

export function TrainingLoadChart({ data }: { data: TrainingLoad[] }) {
  const chartData = data.map((d) => ({
    date: String(d.date).slice(0, 10),
    CTL: d.ctl_42d != null ? Number(d.ctl_42d) : null,
    ATL: d.atl_7d  != null ? Number(d.atl_7d)  : null,
    TSB: d.tsb     != null ? Number(d.tsb)      : null,
  }))

  const tsbMin = Math.min(...chartData.map((d) => d.TSB ?? 0), -35)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceArea y1={tsbMin} y2={-30} fill="#fee2e2" fillOpacity={0.4} label={{ value: 'Overtraining risk', position: 'insideTopLeft', fontSize: 10, fill: '#dc2626' }} />
        <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
        <Area type="monotone" dataKey="CTL" name="CTL (Fitness)" stroke="#3b82f6" fill="#bfdbfe" fillOpacity={0.4} dot={false} strokeWidth={2} connectNulls />
        <Line type="monotone" dataKey="ATL" name="ATL (Fatigue)" stroke="#f97316" dot={false} strokeWidth={2} connectNulls />
        <Line type="monotone" dataKey="TSB" name="TSB (Form)" stroke="#22c55e" dot={false} strokeWidth={1.5} strokeDasharray="5 3" connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
