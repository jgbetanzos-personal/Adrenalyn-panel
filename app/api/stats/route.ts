import { NextResponse } from 'next/server'
import { getStats } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = await getStats()
    return NextResponse.json(stats)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Error loading stats' }, { status: 500 })
  }
}
