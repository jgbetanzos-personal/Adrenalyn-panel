import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { rateExchange, getExchange } from '@/lib/exchanges'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const exchange = await getExchange(id, session.userId)
  if (!exchange) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (exchange.status !== 'completed') {
    return NextResponse.json({ error: 'Exchange not completed' }, { status: 400 })
  }

  const body = await request.json() as { ratedId: number; score: number; comment?: string }
  const { ratedId, score, comment } = body

  if (!ratedId || !score || score < 1 || score > 5) {
    return NextResponse.json({ error: 'Invalid rating data' }, { status: 400 })
  }

  await rateExchange(id, session.userId, ratedId, score, comment)
  return NextResponse.json({ ok: true })
}
