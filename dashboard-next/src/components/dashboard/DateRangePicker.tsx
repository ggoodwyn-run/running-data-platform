'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface DateRangePickerProps {
  minDate: string
  maxDate: string
  start: string
  end: string
}

export function DateRangePicker({ minDate, maxDate, start, end }: DateRangePickerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(key, value)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm font-medium text-gray-700">From</label>
      <input
        type="date"
        value={start}
        min={minDate}
        max={end}
        onChange={(e) => update('start', e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <label className="text-sm font-medium text-gray-700">To</label>
      <input
        type="date"
        value={end}
        min={start}
        max={maxDate}
        onChange={(e) => update('end', e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
