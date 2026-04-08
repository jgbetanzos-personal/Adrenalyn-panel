import { getSession } from '@/lib/session'
import { redirect, notFound } from 'next/navigation'
import { getUserByUsername } from '@/lib/users'
import { getMessages } from '@/lib/messages'
import { ChatClient } from './chat-client'

export const dynamic = 'force-dynamic'

export default async function ChatPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { username } = await params
  const other = await getUserByUsername(username)
  if (!other) notFound()

  const messages = await getMessages(session.userId, other.id)

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="border-b pb-3 mb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          {other.photo_url ? (
            <img
              src={other.photo_url}
              alt={other.name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <span className="text-orange-600 font-bold text-sm">
              {other.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-sm">{other.name} {other.surname}</p>
          <p className="text-xs text-muted-foreground">@{other.username}</p>
        </div>
      </div>
      <ChatClient
        initialMessages={messages}
        currentUserId={session.userId}
        otherUsername={username}
      />
    </div>
  )
}
