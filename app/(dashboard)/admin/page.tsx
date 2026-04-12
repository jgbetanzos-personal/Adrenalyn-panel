import { getAllUsers } from '@/lib/users'
import { getStats } from '@/lib/db'
import { Progress } from '@/components/ui/progress'
import { ChangePasswordForm } from '@/components/change-password-form'
import { DeleteUserButton } from '@/components/delete-user-button'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const users = await getAllUsers()

  const usersWithStats = await Promise.all(
    users.map(async (u) => {
      const stats = await getStats(u.id)
      return { ...u, stats }
    })
  )

  const total = usersWithStats[0]?.stats.total ?? 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground text-sm mt-1">{users.length} coleccionistas · {total} cromos en total</p>
      </div>

      <div className="grid gap-4">
        {usersWithStats.map((u) => (
          <div key={u.id} className="rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
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

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-baseline gap-2">
                <p className="font-semibold">{u.name} {u.surname}</p>
                <span className="text-xs text-muted-foreground">@{u.username}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{u.stats.collected} conseguidos · {u.stats.missing} faltan</span>
                  <span className="font-medium text-foreground">{u.stats.pct}%</span>
                </div>
                <Progress value={u.stats.pct} className="h-2" />
              </div>
            </div>

            {/* Acciones */}
            <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
              <Link
                href={`/admin/${encodeURIComponent(u.username)}`}
                className="rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-3 py-1.5 transition-colors text-center"
              >
                Ver colección
              </Link>
              <Link
                href={`/ver/${encodeURIComponent(u.username)}`}
                target="_blank"
                className="rounded-lg border text-xs font-medium px-3 py-1.5 transition-colors hover:bg-muted text-center"
              >
                Página pública
              </Link>
              <ChangePasswordForm username={u.username} />
              <DeleteUserButton username={u.username} name={u.name || u.username} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
