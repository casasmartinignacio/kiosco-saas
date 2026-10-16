import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await allow(['CASHIER', 'ADMIN'])
  if (blocked) return blocked
  try {
    return pass(await upstream('/orders/documents', 'staff'))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. Intenta de nuevo.' } })
  }
}
