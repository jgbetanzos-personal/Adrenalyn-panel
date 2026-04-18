import { getSession } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import { getExchange } from '@/lib/exchanges'
import { getUserById } from '@/lib/users'
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

  const [exchange, currentUser] = await Promise.all([
    getExchange(id, session.userId),
    getUserById(session.userId),
  ])
  if (!exchange) notFound()

  const postalCodeValid = /^\d{5}$/.test(currentUser?.postal_code?.trim() ?? '')
  const profileComplete = !!(
    currentUser?.name?.trim() &&
    currentUser?.surname?.trim() &&
    currentUser?.address?.trim() &&
    postalCodeValid
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Detalle del intercambio</h1>
      <ExchangeDetailClient
        exchange={exchange}
        currentUserId={session.userId}
        profileComplete={profileComplete}
      />
    </div>
  )
}
