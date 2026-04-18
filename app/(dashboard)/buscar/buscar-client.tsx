'use client'

import Link from 'next/link'
import type { MatchUser } from '@/lib/exchanges'

function UserAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="w-12 h-12 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
      <span className="text-orange-600 font-bold text-lg">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

export function BuscarClient({ matches }: { matches: MatchUser[] }) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No hay usuarios compatibles por ahora.</p>
        <p className="text-sm mt-1">Completa tu colección marcando cromos repetidos y te avisaremos cuando haya coincidencias.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {matches.map(({ user, canRequest, canOffer }) => (
        <div
          key={user.id}
          className="border rounded-xl p-4 flex flex-col gap-3 bg-card hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name} photoUrl={user.photo_url} />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {user.name} {user.surname}
              </p>
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              <span className="font-medium text-foreground">{canRequest}</span> cromos que puedo pedir
            </p>
            <p>
              <span className="font-medium text-foreground">{canOffer}</span> cromos que puedo ofrecer
            </p>
          </div>

          <Link
            href={`/intercambios/nuevo/${encodeURIComponent(user.username)}`}
            className="mt-auto w-full text-center rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 transition-colors"
          >
            Proponer intercambio
          </Link>
        </div>
      ))}
    </div>
  )
}
