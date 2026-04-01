import { getAllCards } from '@/lib/db'
import { CollectionClient } from '@/components/collection-client'

export const dynamic = 'force-dynamic'

export default async function ColeccionPage() {
  const cards = await getAllCards()
  return <CollectionClient initialCards={cards} />
}
