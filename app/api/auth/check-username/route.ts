import { NextRequest, NextResponse } from 'next/server'
import { isUsernameTaken } from '@/lib/users'
import { initDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username') ?? ''
  if (username.length < 3) {
    return NextResponse.json({ available: false })
  }
  await initDb()
  const taken = await isUsernameTaken(username)
  return NextResponse.json({ available: !taken })
}
