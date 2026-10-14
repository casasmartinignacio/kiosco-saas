import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = await allow(['KITCHEN', 'CASHIER'])
  if (blocked) return blocked
  const { id } = await params
  try {
    return pass(await upstream(`/orders/${id}/reprint`, 'staff', { method: 'POST' }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión.' } })
  }
}
