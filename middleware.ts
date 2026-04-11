import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'adrenalyn-panel-secret-2025'
)

const PUBLIC_PATHS = ['/login', '/registro', '/ver', '/api/cards', '/api/auth']

async function getSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { userId: number; username: string; role: string }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_session')?.value
  const session = token ? await getSession(token) : null

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Proteger rutas de admin
  if (pathname.startsWith('/admin') && session.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|escudos|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)'],
}
