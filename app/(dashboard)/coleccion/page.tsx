import { getAllCards } from '@/lib/db'
import { CollectionClient } from '@/components/collection-client'

export const dynamic = 'force-dynamic'

export default function ColeccionPage() {
  const cards = getAllCards()
  return <CollectionClient initialCards={cards} />
}
