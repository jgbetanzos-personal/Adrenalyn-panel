import { getSession } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import { getExchange } from '@/lib/exchanges'
import { ExchangeDetailClient } from './detail-client'

export const dynamic = 'force-dynamic'

export default async function ExchangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) notFound()

  const exchange = await getExchange(id, session.userId)
  if (!exchange) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Detalle del intercambio</h1>
      <ExchangeDetailClient exchange={exchange} currentUserId={session.userId} />
    </div>
  )
}
