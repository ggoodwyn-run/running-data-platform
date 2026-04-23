'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { fmtDate, fmtPace, fmtDuration } from '@/lib/formatters'
import type { RunSummary } from '@/lib/types'

const COLUMNS = [
  { key: 'date_of_activity',    label: 'Date' },
  { key: 'title',               label: 'Title' },
  { key: 'distance_km',         label: 'km',      align: 'right' as const },
  { key: 'moving_time_hours',   label: 'Time',    align: 'right' as const },
  { key: 'avg_pace_min_per_km', label: 'Pace /km', align: 'right' as const },
  { key: 'avg_hr',              label: 'Avg HR',  align: 'right' as const },
  { key: 'max_hr',              label: 'Max HR',  align: 'right' as const },
  { key: 'effort_zone',         label: 'Zone' },
  { key: 'calories',            label: 'Cal',     align: 'right' as const },
  { key: 'total_ascent',        label: 'Ascent',  align: 'right' as const },
]

interface RunsTableProps {
  runs:      RunSummary[]
  total:     number
  page:      number
  pageCount: number
  sort:      string
  order:     string
}

export function RunsTable({ runs, total, page, pageCount, sort, order }: RunsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set(key, value)
    router.push(`${pathname}?${p.toString()}`)
  }

  function toggleSort(key: string) {
    if (sort === key) {
      setParam('order', order === 'ASC' ? 'DESC' : 'ASC')
    } else {
      const p = new URLSearchParams(searchParams.toString())
      p.set('sort', key)
      p.set('order', 'DESC')
      p.set('page', '1')
      router.push(`${pathname}?${p.toString()}`)
    }
  }

  function cell(run: RunSummary, key: string): React.ReactNode {
    switch (key) {
      case 'date_of_activity':    return <span className="whitespace-nowrap text-gray-500">{fmtDate(run.date_of_activity)}</span>
      case 'title':               return (
        <Link href={`/runs/${run.activity_id}`} className="text-blue-600 hover:underline max-w-[180px] block truncate">
          {run.title ?? 'Run'}
        </Link>
      )
      case 'distance_km':         return Number(run.distance_km).toFixed(1)
      case 'moving_time_hours':   return fmtDuration(run.moving_time_hours)
      case 'avg_pace_min_per_km': return fmtPace(run.avg_pace_min_per_km)
      case 'avg_hr':              return run.avg_hr ?? '—'
      case 'max_hr':              return run.max_hr ?? '—'
      case 'effort_zone':         return <Badge label={run.effort_zone} />
      case 'calories':            return run.calories ?? '—'
      case 'total_ascent':        return run.total_ascent != null ? `${run.total_ascent} m` : '—'
      default:                    return null
    }
  }

  const sortable = new Set(['date_of_activity','distance_km','avg_pace_min_per_km','avg_hr','moving_time_hours','calories','total_ascent'])

  return (
    <div>
      <p className="mb-3 text-sm text-gray-500">{total} runs</p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 ${col.align === 'right' ? 'text-right' : 'text-left'} ${sortable.has(col.key) ? 'cursor-pointer hover:text-gray-900 select-none' : ''}`}
                  onClick={() => sortable.has(col.key) && toggleSort(col.key)}
                >
                  {col.label}
                  {sort === col.key && <span className="ml-1">{order === 'ASC' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.activity_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                {COLUMNS.map((col) => (
                  <td key={col.key} className={`px-4 py-3 tabular-nums ${col.align === 'right' ? 'text-right' : ''}`}>
                    {cell(run, col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {pageCount}</p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setParam('page', String(page - 1))}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              disabled={page >= pageCount}
              onClick={() => setParam('page', String(page + 1))}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
