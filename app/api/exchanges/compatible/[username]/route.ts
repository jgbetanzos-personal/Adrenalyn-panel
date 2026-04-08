import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserByUsername } from '@/lib/users'
import { getCompatibleCards } from '@/lib/exchanges'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const other = await getUserByUsername(username)
  if (!other) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const cards = await getCompatibleCards(session.userId, other.id)
  return NextResponse.json(cards)
}
