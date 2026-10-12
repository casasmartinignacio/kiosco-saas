import { pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return pass(await upstream('/orders/summary', 'staff'))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión.' } })
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  try {
    return pass(await upstream('/orders/counter', 'staff', { method: 'POST', body }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. El pedido no se envió.' } })
  }
}
