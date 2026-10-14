import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { readSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await readSession((await cookies()).get('kiosco_staff')?.value, process.env.STAFF_TOKEN || '')
  if (!session) return NextResponse.json({ message: 'Ingresa de nuevo.' }, { status: 401 })
  return NextResponse.json({ name: session.name, role: session.role })
}
