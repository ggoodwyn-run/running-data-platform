import { MetricCard } from '@/components/dashboard/MetricCard'
import { fmtNumber, tsbStatus } from '@/lib/formatters'
import type { TrainingLoad } from '@/lib/types'

const tsbLabels: Record<string, string> = {
  fresh:       'Fresh — ready to race',
  neutral:     'Neutral',
  fatigued:    'Fatigued — recovery advised',
  overtrained: 'Overtraining risk',
}

export function TrainingLoadSummaryCards({ latest }: { latest: TrainingLoad | null }) {
  if (!latest) return null

  const ctl   = latest.ctl_42d != null ? fmtNumber(latest.ctl_42d) : '—'
  const atl   = latest.atl_7d  != null ? fmtNumber(latest.atl_7d)  : '—'
  const tsb   = latest.tsb     != null ? (Number(latest.tsb) >= 0 ? '+' : '') + fmtNumber(latest.tsb) : '—'
  const form  = latest.tsb != null ? tsbLabels[tsbStatus(latest.tsb)] : '—'

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard label="CTL (Fitness)"  value={ctl}   sub="42-day avg load" />
      <MetricCard label="ATL (Fatigue)"  value={atl}   sub="7-day avg load" />
      <MetricCard label="TSB (Form)"     value={tsb}   sub={form} />
      <MetricCard label="Run Streak"     value={`${latest.run_streak}d`} sub="consecutive days" />
    </div>
  )
}
