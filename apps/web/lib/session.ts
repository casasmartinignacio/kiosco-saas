export type Role = 'ADMIN' | 'CASHIER' | 'KITCHEN' | 'SUPERVISOR'

export type Session = { id: string; name: string; role: Role }

const encoder = new TextEncoder()

function b64url(bytes: Uint8Array) {
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return b64url(new Uint8Array(mac))
}

export async function writeSession(session: Session, secret: string) {
  const payload = b64url(encoder.encode(JSON.stringify(session)))
  return `${payload}.${await sign(payload, secret)}`
}

export async function readSession(token: string | undefined, secret: string): Promise<Session | null> {
  if (!token || !secret || !token.includes('.')) return null
  const [payload, mac] = token.split('.')
  if (!payload || mac !== (await sign(payload, secret))) return null
  try {
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0)))) as Session
    if (!json.name || !json.role) return null
    return json
  } catch {
    return null
  }
}

export function homeFor(role: Role) {
  if (role === 'KITCHEN') return '/cocina'
  if (role === 'CASHIER') return '/caja'
  return '/reportes'
}

export const ACCESS: Record<string, Role[]> = {
  '/cocina': ['KITCHEN', 'ADMIN', 'SUPERVISOR'],
  '/caja': ['CASHIER', 'ADMIN', 'SUPERVISOR'],
  '/cierre': ['CASHIER', 'ADMIN', 'SUPERVISOR'],
  '/entrega': ['CASHIER', 'KITCHEN', 'ADMIN', 'SUPERVISOR'],
  '/admin': ['ADMIN', 'SUPERVISOR'],
  '/promos': ['ADMIN', 'SUPERVISOR'],
  '/inventario': ['ADMIN', 'SUPERVISOR'],
  '/reportes': ['ADMIN', 'SUPERVISOR'],
  '/bitacora': ['ADMIN', 'SUPERVISOR'],
  '/clientes': ['ADMIN', 'SUPERVISOR'],
  '/equipo': ['ADMIN'],
  '/local': ['ADMIN'],
}
