import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: string } | null
  if (!process.env.STAFF_PIN || body?.pin !== process.env.STAFF_PIN) {
    return NextResponse.json({ message: 'Clave incorrecta' }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set('kiosco_staff', process.env.STAFF_TOKEN || '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 14,
  })
  return response
}
