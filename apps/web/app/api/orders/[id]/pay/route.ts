import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = await allow(['CASHIER', 'ADMIN'])
  if (blocked) return blocked
  const { id } = await params
  const body = await request.text()
  try {
    return pass(await upstream(`/orders/${id}/pay`, 'staff', { method: 'POST', body }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. El cobro no se registró.' } })
  }
}
