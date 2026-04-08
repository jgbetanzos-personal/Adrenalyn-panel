import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { findMatches } from '@/lib/exchanges'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const matches = await findMatches(session.userId)
  return NextResponse.json(matches)
}
