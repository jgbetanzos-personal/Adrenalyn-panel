import { getAllCards } from '@/lib/db'
import { CollectionClient } from '@/components/collection-client'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ColeccionPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const cards = await getAllCards(session.userId)
  return <CollectionClient initialCards={cards} />
}
