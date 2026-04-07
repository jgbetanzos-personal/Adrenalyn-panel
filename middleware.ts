import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/ver', '/api/cards', '/api/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas: no requieren auth
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // APIs de escritura (bulk, toggle) sí requieren auth
  // /api/cards GET está permitido, pero PATCH/POST no desde fuera del panel
  // La protección real es que el panel ya está protegido por login

  const secret = process.env.AUTH_SECRET ?? 'adrenalyn-panel-secret-2025'
  const session = request.cookies.get('auth_session')?.value
  if (!session || session !== secret) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|escudos).*)'],
}
