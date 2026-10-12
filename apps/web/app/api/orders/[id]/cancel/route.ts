import { pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.text()
  try {
    return pass(await upstream(`/orders/${id}/cancel`, 'staff', { method: 'POST', body }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión.' } })
  }
}
