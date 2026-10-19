import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const blocked = await allow(['CASHIER', 'ADMIN'])
  if (blocked) return blocked
  const number = new URL(request.url).searchParams.get('number') || ''
  try {
    return pass(await upstream(`/orders/unpaid?number=${encodeURIComponent(number)}`, 'staff'))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión.' } })
  }
}
