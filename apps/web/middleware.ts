import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('kiosco_staff')?.value
  if (!process.env.STAFF_TOKEN || token !== process.env.STAFF_TOKEN) {
    const url = request.nextUrl.clone()
    url.pathname = '/acceso'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/cocina', '/admin'] }
