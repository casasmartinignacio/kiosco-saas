import { pass, upstream } from '@/lib/upstream'

export const dynamic = 'force-dynamic'

async function forward(request: Request, path: string[], method: string) {
  const url = new URL(request.url)
  const body = method === 'GET' ? undefined : await request.text()
  try {
    return pass(await upstream(`/staff/${path.join('/')}${url.search}`, 'staff', { method, body }))
  } catch {
    return pass({ ok: false, status: 503, data: { message: 'No hay conexión. Intenta de nuevo.' } })
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return forward(request, path, 'GET')
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return forward(request, path, 'POST')
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return forward(request, path, 'PUT')
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  return forward(request, path, 'PATCH')
}
