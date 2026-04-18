import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getExchanges } from '@/lib/exchanges'
import { getUserById } from '@/lib/users'
import { IntercambiosClient } from './page-client'

export const dynamic = 'force-dynamic'

export default async function IntercambiosPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [exchanges, currentUser] = await Promise.all([
    getExchanges(session.userId),
    getUserById(session.userId),
  ])

  const profileComplete = !!(
    currentUser?.name?.trim() &&
    currentUser?.surname?.trim() &&
    currentUser?.address?.trim() &&
    /^\d{5}$/.test(currentUser?.postal_code?.trim() ?? '')
  )

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Mis intercambios</h1>
      <p className="text-muted-foreground mb-6">
        Gestiona tus propuestas de intercambio
      </p>
      <IntercambiosClient exchanges={exchanges} currentUserId={session.userId} profileComplete={profileComplete} />
    </div>
  )
}
