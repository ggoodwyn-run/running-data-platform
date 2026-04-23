import { Badge } from '@/components/ui/badge'
import { fmtDate, fmtPace, fmtKm, fmtDuration } from '@/lib/formatters'
import type { RunSummary } from '@/lib/types'

export function RunDetailHero({ run }: { run: RunSummary }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 px-8 py-10 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-blue-200 text-sm">{fmtDate(run.date_of_activity)} &middot; {run.day_of_week}</p>
          <h1 className="mt-1 text-3xl font-bold">{run.title ?? 'Run'}</h1>
        </div>
        <Badge label={run.effort_zone} className="mt-1" />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-6">
        <div>
          <p className="text-blue-200 text-xs uppercase tracking-wide">Distance</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{fmtKm(run.distance_km)}</p>
          <p className="text-blue-300 text-sm">{Number(run.distance_miles).toFixed(1)} mi</p>
        </div>
        <div>
          <p className="text-blue-200 text-xs uppercase tracking-wide">Time</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{fmtDuration(run.moving_time_hours)}</p>
          <p className="text-blue-300 text-sm">{Number(run.moving_time_minutes).toFixed(0)} min</p>
        </div>
        <div>
          <p className="text-blue-200 text-xs uppercase tracking-wide">Avg Pace</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{fmtPace(run.avg_pace_min_per_km)}</p>
          <p className="text-blue-300 text-sm">{fmtPace(run.avg_pace_min_per_mile)} /mi</p>
        </div>
      </div>
    </div>
  )
}
