import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { updateUserProfile, getUserById } from '@/lib/users'
import { put } from '@vercel/blob'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData    = await req.formData()
  const name        = formData.get('name')        as string
  const surname     = formData.get('surname')     as string
  const email       = formData.get('email')       as string
  const address     = formData.get('address')     as string
  const postal_code = formData.get('postal_code') as string
  const photo       = formData.get('photo')       as File | null

  let photo_url: string | undefined

  if (photo && photo.size > 0) {
    const blob = await put(`avatars/${session.username}-${Date.now()}.${photo.name.split('.').pop()}`, photo, {
      access: 'public',
    })
    photo_url = blob.url
  }

  await updateUserProfile(session.userId, { name, surname, email, address, postal_code, photo_url })

  const user = await getUserById(session.userId)
  return NextResponse.json(user)
}
