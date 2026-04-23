import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { fmtDate, fmtPace, fmtDuration } from '@/lib/formatters'
import type { RunSummary } from '@/lib/types'

export function RecentRunsTable({ runs }: { runs: RunSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wide text-gray-500">
            <th className="pb-2 pr-4 text-left">Date</th>
            <th className="pb-2 pr-4 text-left">Title</th>
            <th className="pb-2 pr-4 text-right">km</th>
            <th className="pb-2 pr-4 text-right">Time</th>
            <th className="pb-2 pr-4 text-right">Pace /km</th>
            <th className="pb-2 pr-4 text-right">Avg HR</th>
            <th className="pb-2 text-left">Zone</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.activity_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="py-2 pr-4 whitespace-nowrap text-gray-500">{fmtDate(run.date_of_activity)}</td>
              <td className="py-2 pr-4 max-w-[160px] truncate">
                <Link href={`/runs/${run.activity_id}`} className="text-blue-600 hover:underline">
                  {run.title ?? 'Run'}
                </Link>
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{Number(run.distance_km).toFixed(1)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{fmtDuration(run.moving_time_hours)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{fmtPace(run.avg_pace_min_per_km)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{run.avg_hr ?? '—'}</td>
              <td className="py-2"><Badge label={run.effort_zone} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
