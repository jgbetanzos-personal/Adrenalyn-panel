import { NextResponse } from 'next/server'
import { getAllCards } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const cards = await getAllCards(session.userId)
    return NextResponse.json(cards)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error loading cards' }, { status: 500 })
  }
}
