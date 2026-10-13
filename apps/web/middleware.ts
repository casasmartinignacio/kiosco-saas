import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ACCESS, homeFor, readSession } from './lib/session'

export async function middleware(request: NextRequest) {
  const session = await readSession(request.cookies.get('kiosco_staff')?.value, process.env.STAFF_TOKEN || '')
  const url = request.nextUrl.clone()
  if (!session) {
    url.pathname = '/acceso'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  const allowed = ACCESS[request.nextUrl.pathname]
  if (allowed && !allowed.includes(session.role)) {
    url.pathname = homeFor(session.role)
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/cocina', '/admin', '/caja', '/entrega', '/cierre', '/promos', '/inventario', '/reportes', '/bitacora', '/clientes', '/equipo', '/local'],
}
