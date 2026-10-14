import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await allow(['CASHIER'])
  if (blocked) return blocked
  try {
    return pass(await upstream('/orders/summary', 'staff'))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión.' } })
  }
}

export async function POST(request: Request) {
  const blocked = await allow(['CASHIER'])
  if (blocked) return blocked
  const body = await request.text()
  try {
    return pass(await upstream('/orders/counter', 'staff', { method: 'POST', body }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. El pedido no se envió.' } })
  }
}
