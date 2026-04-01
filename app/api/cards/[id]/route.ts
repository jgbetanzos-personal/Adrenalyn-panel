import { NextRequest, NextResponse } from 'next/server'
import { toggleCard } from '@/lib/db'

export const dynamic = 'force-dynamic'

export function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const numId = parseInt(id, 10)
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }
    try {
      const card = toggleCard(numId)
      return NextResponse.json(card)
    } catch (err) {
      console.error(err)
      return NextResponse.json({ error: 'Error toggling card' }, { status: 500 })
    }
  })
}
