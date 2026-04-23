import { Suspense } from 'react'
import { getRuns } from '@/lib/queries/runs'
import { RunsTable } from '@/components/runs/RunsTable'

export const revalidate = 300

interface SearchParams {
  start?: string; end?: string; zone?: string
  sort?: string;  order?: string; page?: string
}

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const { runs, total, pageCount } = await getRuns({
    start: sp.start,
    end:   sp.end,
    zone:  sp.zone,
    sort:  sp.sort ?? 'date_of_activity',
    order: sp.order ?? 'DESC',
    page,
    limit: 25,
  })

  const zones = ['Easy', 'Moderate', 'Hard', 'Max Effort', 'Unknown']

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <h2 className="text-2xl font-bold text-gray-900">All Runs</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          {zones.map((z) => (
            <a
              key={z}
              href={`/runs?zone=${encodeURIComponent(z)}&page=1`}
              className={`rounded-full px-3 py-1 border ${sp.zone === z ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              {z}
            </a>
          ))}
          {sp.zone && (
            <a href="/runs" className="rounded-full px-3 py-1 border border-gray-300 text-gray-500 hover:bg-gray-50">
              Clear
            </a>
          )}
        </div>
      </div>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-gray-100" />}>
        <RunsTable
          runs={runs}
          total={total}
          page={page}
          pageCount={pageCount}
          sort={sp.sort ?? 'date_of_activity'}
          order={sp.order ?? 'DESC'}
        />
      </Suspense>
    </div>
  )
}
