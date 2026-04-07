import { getUserByUsername } from '@/lib/users'
import { getAllCards } from '@/lib/db'
import { CollectionPublic } from '@/components/collection-public'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function VerUserPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const user = await getUserByUsername(username)

  if (!user || user.role === 'superadmin') notFound()

  const cards = await getAllCards(user.id)

  const collected = cards.filter(c => c.collected).length
  const repeated  = cards.filter(c => c.repeated).length
  const pct       = Math.round((collected / cards.length) * 100)

  return (
    <div className="min-h-screen bg-background">
      {/* Header público */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center gap-5">
          {user.photo_url ? (
            <Image
              src={user.photo_url}
              alt={user.name}
              width={72}
              height={72}
              className="rounded-full object-cover w-18 h-18 shrink-0"
              unoptimized
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-2xl shrink-0">
              {user.name.charAt(0)}
            </div>
          )}
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold">{user.name} {user.surname}</h1>
            <p className="text-sm text-muted-foreground">
              {collected} cromos conseguidos · {pct}% completado
              {repeated > 0 && ` · ${repeated} repetidos`}
            </p>
          </div>
          <div className="ml-auto">
            <Link href="/ver" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              ← Volver
            </Link>
          </div>
        </div>
      </div>

      <CollectionPublic cards={cards} />
    </div>
  )
}
