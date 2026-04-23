import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  className?: string
}

export function MetricCard({ label, value, sub, className }: MetricCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-sm text-gray-400">{sub}</p>}
      </CardContent>
    </Card>
  )
}
