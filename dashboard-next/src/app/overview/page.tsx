import { Suspense } from 'react'
import { getOverviewStats, getRecentRuns } from '@/lib/queries/overview'
import { getMonthlyStats } from '@/lib/queries/monthly'
import { getTrainingLoad } from '@/lib/queries/training'
import { getAllRuns } from '@/lib/queries/runs'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DateRangePicker } from '@/components/dashboard/DateRangePicker'
import { RecentRunsTable } from '@/components/dashboard/RecentRunsTable'
import { MonthlyMileageChart } from '@/components/charts/MonthlyMileageChart'
import { TrainingLoadChart } from '@/components/charts/TrainingLoadChart'
import { PaceTrendChart } from '@/components/charts/PaceTrendChart'
import { HRTrendChart } from '@/components/charts/HRTrendChart'
import { EffortZoneChart } from '@/components/charts/EffortZoneChart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { fmtPace, fmtDate, fmtKm, fmtMiles, fmtDuration } from '@/lib/formatters'

export const revalidate = 300

interface SearchParams { start?: string; end?: string }

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { start, end } = await searchParams

  const [stats, allRuns, monthly, training] = await Promise.all([
    getOverviewStats(),
    getAllRuns(),
    getMonthlyStats(),
    getTrainingLoad(),
  ])

  const minDate = allRuns[0]?.date_of_activity ?? ''
  const maxDate = allRuns[allRuns.length - 1]?.date_of_activity ?? ''

  const startDate = start ?? minDate
  const endDate   = end   ?? maxDate

  const filteredRuns = allRuns
    .map((r) => ({ ...r, date_of_activity: String(r.date_of_activity).slice(0, 10) }))
    .filter((r) => r.date_of_activity >= startDate && r.date_of_activity <= endDate)

  const recentRuns = await getRecentRuns(10)

  const totalKm   = filteredRuns.reduce((s, r) => s + Number(r.distance_km), 0)
  const totalMi   = filteredRuns.reduce((s, r) => s + Number(r.distance_miles), 0)
  const totalHrs  = filteredRuns.reduce((s, r) => s + Number(r.moving_time_hours), 0)
  const avgPaces  = filteredRuns.filter((r) => r.avg_pace_min_per_km).map((r) => Number(r.avg_pace_min_per_km))
  const avgPace   = avgPaces.length ? avgPaces.reduce((s, v) => s + v, 0) / avgPaces.length : null

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <p className="text-sm text-gray-500">
            Last run: {fmtDate(stats.lastRunDate)} &middot; {filteredRuns.length} runs in range
          </p>
        </div>
        <Suspense>
          <DateRangePicker minDate={minDate} maxDate={maxDate} start={startDate} end={endDate} />
        </Suspense>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Runs"         value={String(filteredRuns.length)} />
        <MetricCard label="Distance"     value={fmtKm(totalKm)} />
        <MetricCard label="Miles"        value={fmtMiles(totalMi)} />
        <MetricCard label="Time"         value={fmtDuration(totalHrs)} />
        <MetricCard label="Avg Pace"     value={`${fmtPace(avgPace)} /km`} />
      </div>

      {/* Monthly mileage */}
      <Card>
        <CardHeader><CardTitle>Monthly Mileage</CardTitle></CardHeader>
        <CardContent><MonthlyMileageChart data={monthly} /></CardContent>
      </Card>

      {/* Pace + HR trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Pace per Run</CardTitle></CardHeader>
          <CardContent><PaceTrendChart runs={filteredRuns} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Heart Rate per Run</CardTitle></CardHeader>
          <CardContent><HRTrendChart runs={filteredRuns} /></CardContent>
        </Card>
      </div>

      {/* Training load */}
      <Card>
        <CardHeader>
          <CardTitle>Training Load</CardTitle>
          <p className="mt-1 text-xs text-gray-400">CTL = 42-day fitness baseline · ATL = 7-day acute fatigue · TSB = CTL − ATL (form)</p>
        </CardHeader>
        <CardContent><TrainingLoadChart data={training} /></CardContent>
      </Card>

      {/* Effort zones + recent runs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader><CardTitle>Effort Zones</CardTitle></CardHeader>
          <CardContent><EffortZoneChart runs={filteredRuns} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Runs</CardTitle></CardHeader>
          <CardContent><RecentRunsTable runs={recentRuns} /></CardContent>
        </Card>
      </div>
    </div>
  )
}
