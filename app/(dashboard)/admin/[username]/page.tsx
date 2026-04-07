import { getUserByUsername } from '@/lib/users'
import { getAllCards } from '@/lib/db'
import { CollectionPublic } from '@/components/collection-public'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const user = await getUserByUsername(username)
  if (!user || user.role === 'superadmin') notFound()

  const cards = await getAllCards(user.id)
  const collected = cards.filter(c => c.collected).length
  const pct = Math.round((collected / cards.length) * 100)

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-4">
        {user.photo_url ? (
          <Image
            src={user.photo_url}
            alt={user.name}
            width={56}
            height={56}
            className="rounded-full object-cover w-14 h-14 shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl shrink-0">
            {user.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{user.name} {user.surname}</h1>
          <p className="text-sm text-muted-foreground">{collected} / {cards.length} cromos · {pct}%</p>
        </div>
        <Link href="/admin" className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
          ← Volver
        </Link>
      </div>

      <CollectionPublic cards={cards} />
    </div>
  )
}
