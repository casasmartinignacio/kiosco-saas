import { pass } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const headers = new Headers()
    const res = await fetch(`${process.env.API_URL}/orders/ready`, { cache: 'no-store', headers })
    const data = await res.json().catch(() => null)
    if (!res.ok) return pass({ ok: false, status: res.status, data })
    return pass({ ok: true, status: 200, data })
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión.' } })
  }
}
