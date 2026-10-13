import { pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  try {
    return pass(await upstream(`/customers/${encodeURIComponent(code)}`, 'device'))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. Intenta de nuevo.' } })
  }
}
