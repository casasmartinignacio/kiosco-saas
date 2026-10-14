import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const blocked = await allow(['PICKUP'])
  if (blocked) return blocked
  const number = new URL(request.url).searchParams.get('number') || ''
  try {
    return pass(await upstream(`/orders/lookup?number=${encodeURIComponent(number)}`, 'staff'))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión.' } })
  }
}

export async function POST(request: Request) {
  const blocked = await allow(['PICKUP'])
  if (blocked) return blocked
  const body = (await request.json().catch(() => null)) as { id?: string } | null
  if (!body?.id) return pass({ ok: false, status: 400, data: { message: 'Indica el pedido.' } })
  try {
    return pass(await upstream(`/orders/${body.id}/deliver`, 'staff', { method: 'POST' }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión.' } })
  }
}
