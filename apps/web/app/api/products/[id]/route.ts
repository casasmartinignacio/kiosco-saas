import { allow, pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = await allow(['ADMIN', 'SUPERVISOR'])
  if (blocked) return blocked
  const { id } = await context.params
  const body = await request.text()
  try {
    return pass(await upstream(`/products/${id}`, 'staff', { method: 'PATCH', body }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No se pudo guardar.' } })
  }
}
