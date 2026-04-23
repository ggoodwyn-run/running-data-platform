import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRunById } from '@/lib/queries/runs'
import { RunDetailHero } from '@/components/runs/RunDetailHero'
import { RunDetailStatGrid } from '@/components/runs/RunDetailStatGrid'

export const revalidate = 300

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ activityId: string }>
}) {
  const { activityId } = await params
  const data = await getRunById(activityId)
  if (!data) notFound()

  const { run, training, prevId, nextId } = data

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back + Prev/Next nav */}
      <div className="flex items-center justify-between">
        <Link href="/runs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          ← All Runs
        </Link>
        <div className="flex gap-3 text-sm">
          {prevId ? (
            <Link href={`/runs/${prevId}`} className="text-gray-500 hover:text-gray-900">← Prev run</Link>
          ) : (
            <span className="text-gray-300">← Prev run</span>
          )}
          {nextId ? (
            <Link href={`/runs/${nextId}`} className="text-gray-500 hover:text-gray-900">Next run →</Link>
          ) : (
            <span className="text-gray-300">Next run →</span>
          )}
        </div>
      </div>

      <RunDetailHero run={run} />
      <RunDetailStatGrid run={run} training={training} />
    </div>
  )
}
