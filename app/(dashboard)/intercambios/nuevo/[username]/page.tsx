import { getSession } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import { getUserByUsername } from '@/lib/users'
import { getCompatibleCards } from '@/lib/exchanges'
import { NuevoClient } from './nuevo-client'

export const dynamic = 'force-dynamic'

export default async function NuevoIntercambioPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { username: rawUsername } = await params
  const other = await getUserByUsername(decodeURIComponent(rawUsername))
  if (!other) notFound()

  if (other.id === session.userId) redirect('/buscar')

  const { iCanRequest, iCanOffer } = await getCompatibleCards(session.userId, other.id)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Proponer intercambio</h1>
      <p className="text-muted-foreground mb-6">
        Con{' '}
        <span className="font-medium text-foreground">
          {other.name} {other.surname}
        </span>{' '}
        (@{other.username})
      </p>
      <NuevoClient
        receiverId={other.id}
        receiverName={`${other.name} ${other.surname}`}
        iCanRequest={iCanRequest}
        iCanOffer={iCanOffer}
      />
    </div>
  )
}
