import { pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    return pass(await upstream(`/orders/${id}/advance`, 'staff', { method: 'POST' }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. Intenta de nuevo.' } })
  }
}
