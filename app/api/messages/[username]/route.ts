import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserByUsername } from '@/lib/users'
import { getMessages, sendMessage } from '@/lib/messages'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const other = await getUserByUsername(decodeURIComponent(username))
  if (!other) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const messages = await getMessages(session.userId, other.id)
  return NextResponse.json(messages)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const other = await getUserByUsername(decodeURIComponent(username))
  if (!other) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await request.json() as { content: string }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 })
  }

  const message = await sendMessage(session.userId, other.id, body.content.trim())
  return NextResponse.json(message, { status: 201 })
}
