import { NextResponse } from 'next/server'

export async function upstream(path: string, key: 'device' | 'staff', init?: RequestInit) {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  const secret = key === 'device' ? process.env.DEVICE_KEY : process.env.STAFF_KEY
  headers.set(key === 'device' ? 'x-device-key' : 'x-staff-key', secret || '')
  const res = await fetch(`${process.env.API_URL}${path}`, { ...init, headers, cache: 'no-store' })
  const text = await res.text()
  let data: { message?: string | string[] } | null = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  return { ok: res.ok, status: res.status, data }
}

export function pass(result: { ok: boolean; status: number; data: { message?: string | string[] } | null }) {
  if (result.ok) return NextResponse.json(result.data)
  const message = Array.isArray(result.data?.message) ? result.data?.message[0] : result.data?.message
  return NextResponse.json({ message: message || 'No se pudo completar.' }, { status: result.status })
}
