import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { findMatches } from '@/lib/exchanges'
import { BuscarClient } from './buscar-client'

export const dynamic = 'force-dynamic'

export default async function BuscarPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const matches = await findMatches(session.userId)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Buscar intercambios</h1>
      <p className="text-muted-foreground mb-6">
        Usuarios con los que puedes intercambiar cromos
      </p>
      <BuscarClient matches={matches} />
    </div>
  )
}
