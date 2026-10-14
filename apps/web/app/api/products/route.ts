import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET() {
  const blocked = await allow(['ADMIN', 'SUPERVISOR'])
  if (blocked) return blocked
  try {
    return pass(await upstream('/products', 'staff'))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. Intenta de nuevo.' } })
  }
}
