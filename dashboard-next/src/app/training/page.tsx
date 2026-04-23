import { getTrainingLoad } from '@/lib/queries/training'
import { TrainingLoadSummaryCards } from '@/components/training/TrainingLoadSummaryCards'
import { TrainingLoadChart } from '@/components/charts/TrainingLoadChart'
import { RollingMileageChart } from '@/components/charts/RollingMileageChart'
import { WoWChart } from '@/components/charts/WoWChart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export const revalidate = 300

export default async function TrainingPage() {
  const training = await getTrainingLoad()
  const latest = training[training.length - 1] ?? null

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Training Load</h2>
        <p className="mt-1 text-sm text-gray-500">
          ATL/CTL/TSB model · load score = moving time × (avg HR / 100)
        </p>
      </div>

      <TrainingLoadSummaryCards latest={latest} />

      <Card>
        <CardHeader>
          <CardTitle>CTL / ATL / TSB over Time</CardTitle>
          <p className="mt-1 text-xs text-gray-400">Shaded red zone = TSB below −30 (overtraining risk)</p>
        </CardHeader>
        <CardContent>
          <TrainingLoadChart data={training} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rolling Mileage</CardTitle></CardHeader>
        <CardContent>
          <RollingMileageChart data={training} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Week-over-Week Mileage Change</CardTitle>
          <p className="mt-1 text-xs text-gray-400">Positive = more volume than previous 7 days</p>
        </CardHeader>
        <CardContent>
          <WoWChart data={training} />
        </CardContent>
      </Card>
    </div>
  )
}
