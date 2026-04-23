import { cn } from '@/lib/utils'

const variants = {
  Easy:        'bg-green-100 text-green-800',
  Moderate:    'bg-yellow-100 text-yellow-800',
  Hard:        'bg-orange-100 text-orange-800',
  'Max Effort':'bg-red-100 text-red-800',
  Unknown:     'bg-gray-100 text-gray-600',
  default:     'bg-gray-100 text-gray-600',
} as const

type BadgeVariant = keyof typeof variants

export function Badge({ label, className }: { label: string; className?: string }) {
  const variant = (variants[label as BadgeVariant] ?? variants.default)
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variant, className)}>
      {label}
    </span>
  )
}
