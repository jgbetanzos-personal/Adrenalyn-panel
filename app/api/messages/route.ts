import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getConversations } from '@/lib/messages'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conversations = await getConversations(session.userId)
  return NextResponse.json(conversations)
}
