import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { getConversations } from '@/lib/messages'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MensajesPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const conversations = await getConversations(session.userId)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Mensajes</h1>
      <p className="text-muted-foreground mb-6">Tus conversaciones</p>

      {conversations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No tienes conversaciones todavía.</p>
          <p className="text-sm mt-1">
            Ve a{' '}
            <Link href="/buscar" className="text-orange-500 underline">
              buscar intercambios
            </Link>{' '}
            para contactar con otros usuarios.
          </p>
        </div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {conversations.map(({ user, lastMessage, lastAt, unread }) => (
            <Link
              key={user.id}
              href={`/mensajes/${encodeURIComponent(user.username)}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-orange-600 font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">
                    {user.name} {user.surname}
                  </p>
                  <p className="text-xs text-muted-foreground shrink-0 ml-2">
                    {new Date(lastAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">{lastMessage}</p>
                  {unread > 0 && (
                    <span className="ml-2 shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-medium">
                      {unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
