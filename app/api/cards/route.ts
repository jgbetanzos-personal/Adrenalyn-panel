import { NextResponse } from 'next/server'
import { getAllCards } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cards = await getAllCards()
    return NextResponse.json(cards)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error loading cards' }, { status: 500 })
  }
}
