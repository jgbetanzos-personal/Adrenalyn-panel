import { NextResponse } from 'next/server'
import { getStats } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const stats = await getStats(session.userId)
    return NextResponse.json(stats)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error loading stats' }, { status: 500 })
  }
}
