import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUnreadExchangeCount } from '@/lib/exchanges'
import { getUnreadMessageCount } from '@/lib/messages'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [exchanges, messages] = await Promise.all([
    getUnreadExchangeCount(session.userId),
    getUnreadMessageCount(session.userId),
  ])

  return NextResponse.json({ exchanges, messages })
}
