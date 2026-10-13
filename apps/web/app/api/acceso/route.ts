import { NextResponse } from 'next/server'
import { upstream } from '@/lib/upstream'
import { writeSession, type Role } from '@/lib/session'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { pin?: string } | null
  const result = await upstream('/staff/login', 'staff', {
    method: 'POST',
    body: JSON.stringify({ pin: body?.pin || '' }),
  }).catch(() => null)
  const user = result?.data as { id?: string; name?: string; role?: Role } | null
  if (!result?.ok || !user?.id || !user.name || !user.role) {
    return NextResponse.json({ message: 'Clave incorrecta' }, { status: 401 })
  }
  const response = NextResponse.json({ name: user.name, role: user.role })
  response.cookies.set('kiosco_staff', await writeSession({ id: user.id, name: user.name, role: user.role }, process.env.STAFF_TOKEN || ''), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 14,
  })
  return response
}
