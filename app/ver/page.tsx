import { getAllCards } from '@/lib/db'
import { CollectionPublic } from '@/components/collection-public'

export const dynamic = 'force-dynamic'

export default async function VerPage() {
  const cards = await getAllCards()
  return <CollectionPublic cards={cards} />
}
