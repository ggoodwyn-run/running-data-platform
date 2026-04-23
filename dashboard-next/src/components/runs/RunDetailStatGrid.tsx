import { Card, CardContent } from '@/components/ui/card'
import type { RunSummary } from '@/lib/types'
import type { TrainingLoad } from '@/lib/types'
import { fmtNumber, tsbStatus, fmtDate } from '@/lib/formatters'

const tsbColors: Record<string, string> = {
  fresh:      'text-green-600',
  neutral:    'text-gray-600',
  fatigued:   'text-orange-500',
  overtrained:'text-red-600',
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function RunDetailStatGrid({ run, training }: { run: RunSummary; training: TrainingLoad | null }) {
  const tsb = training?.tsb != null ? Number(training.tsb) : null
  const tsbColor = tsbColors[tsbStatus(tsb)]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Run Stats</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Avg HR"       value={run.avg_hr ? `${run.avg_hr} bpm` : '—'} />
        <Stat label="Max HR"       value={run.max_hr ? `${run.max_hr} bpm` : '—'} />
        <Stat label="Cadence"      value={run.avg_run_cadence ? `${run.avg_run_cadence} spm` : '—'} />
        <Stat label="Stride"       value={run.avg_stride_length ? `${run.avg_stride_length} m` : '—'} />
        <Stat label="Calories"     value={run.calories ? `${run.calories} kcal` : '—'} />
        <Stat label="Ascent"       value={run.total_ascent != null ? `${run.total_ascent} m` : '—'} sub={run.total_descent != null ? `↓ ${run.total_descent} m` : undefined} />
        <Stat label="Steps"        value={run.steps ? run.steps.toLocaleString() : '—'} />
        <Stat label="Week of"      value={run.week_start ? fmtDate(run.week_start) : '—'} />
      </div>

      {training && (
        <>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-gray-500">Training Context on this Day</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="CTL (Fitness)"  value={training.ctl_42d != null ? fmtNumber(training.ctl_42d) : '—'} sub="42-day avg load" />
            <Stat label="ATL (Fatigue)"  value={training.atl_7d  != null ? fmtNumber(training.atl_7d)  : '—'} sub="7-day avg load" />
            <div>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">TSB (Form)</p>
                  <p className={`mt-1 text-xl font-bold tabular-nums ${tsbColor}`}>
                    {tsb != null ? (tsb >= 0 ? '+' : '') + fmtNumber(tsb) : '—'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">{tsbStatus(tsb)}</p>
                </CardContent>
              </Card>
            </div>
            <Stat label="7-day km"       value={training.km_7d_rolling != null ? `${Number(training.km_7d_rolling).toFixed(1)} km` : '—'} sub="rolling total" />
          </div>
        </>
      )}
    </div>
  )
}
