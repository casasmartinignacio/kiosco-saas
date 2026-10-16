import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await allow(['KITCHEN', 'ADMIN'])
  if (blocked) return blocked
  try {
    return pass(await upstream('/orders/board', 'staff'))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. Intenta de nuevo.' } })
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  try {
    return pass(await upstream('/orders', 'device', { method: 'POST', body }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. Tu pedido no se envió.' } })
  }
}
