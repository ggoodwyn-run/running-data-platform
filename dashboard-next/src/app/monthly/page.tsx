import { getMonthlyStats } from '@/lib/queries/monthly'
import { MonthlyMileageChart } from '@/components/charts/MonthlyMileageChart'
import { MonthlyStatsTable } from '@/components/monthly/MonthlyStatsTable'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export const revalidate = 300

export default async function MonthlyPage() {
  const monthly = await getMonthlyStats()

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Monthly Breakdown</h2>

      <Card>
        <CardHeader><CardTitle>Monthly Mileage</CardTitle></CardHeader>
        <CardContent><MonthlyMileageChart data={monthly} /></CardContent>
      </Card>

      <MonthlyStatsTable data={monthly} />
    </div>
  )
}
