import { getAllUsers } from '@/lib/users'
import { getStats } from '@/lib/db'
import { Progress } from '@/components/ui/progress'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function VerPage() {
  const users = await getAllUsers()

  const usersWithStats = await Promise.all(
    users.map(async (u) => {
      const stats = await getStats(u.id)
      return { ...u, stats }
    })
  )

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Adrenalyn XL LaLiga 2025-26</h1>
          <p className="text-muted-foreground text-sm">Colecciones de los jugadores</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {usersWithStats.map((u) => (
            <Link
              key={u.id}
              href={`/ver/${encodeURIComponent(u.username)}`}
              className="rounded-xl border p-5 flex items-center gap-4 hover:bg-muted/50 transition-colors"
            >
              <div className="shrink-0">
                {u.photo_url ? (
                  <Image
                    src={u.photo_url}
                    alt={u.name}
                    width={56}
                    height={56}
                    className="rounded-full object-cover w-14 h-14"
                    unoptimized
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xl">
                    {u.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="font-semibold">{u.name} {u.surname}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{u.stats.collected} / {u.stats.total} cromos</span>
                  <span className="font-medium text-foreground">{u.stats.pct}%</span>
                </div>
                <Progress value={u.stats.pct} className="h-1.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
