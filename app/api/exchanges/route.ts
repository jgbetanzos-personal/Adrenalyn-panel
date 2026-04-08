import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getExchanges, createExchange } from '@/lib/exchanges'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exchanges = await getExchanges(session.userId)
  return NextResponse.json(exchanges)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    receiverId: number
    proposerGives: number[]
    receiverGives: number[]
    message?: string
  }

  if (!body.receiverId || !Array.isArray(body.proposerGives) || !Array.isArray(body.receiverGives)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (body.proposerGives.length === 0 && body.receiverGives.length === 0) {
    return NextResponse.json({ error: 'Must include at least one card' }, { status: 400 })
  }

  const id = await createExchange(
    session.userId,
    body.receiverId,
    body.proposerGives,
    body.receiverGives,
    body.message,
  )

  return NextResponse.json({ id }, { status: 201 })
}
