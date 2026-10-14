export type Role = 'ADMIN' | 'CASHIER' | 'KITCHEN' | 'SUPERVISOR' | 'PICKUP'

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
    if (!json.name || !json.role || !NAV[json.role]) return null
    return json
  } catch {
    return null
  }
}

export const STATIONS: { role: Role; label: string; home: string }[] = [
  { role: 'KITCHEN', label: 'Cocina', home: '/cocina' },
  { role: 'CASHIER', label: 'POS', home: '/pos' },
  { role: 'PICKUP', label: 'Entrega', home: '/entrega' },
  { role: 'ADMIN', label: 'Negocio', home: '/negocio' },
  { role: 'SUPERVISOR', label: 'Supervisión', home: '/negocio' },
]

const BUSINESS = [
  { href: '/negocio', label: 'Negocio', section: 'negocio' },
  { href: '/admin', label: 'Productos', section: 'productos' },
  { href: '/promos', label: 'Promos', section: 'promos' },
  { href: '/inventario', label: 'Inventario', section: 'inventario' },
  { href: '/clientes', label: 'Clientes', section: 'clientes' },
  { href: '/reportes', label: 'Reportes', section: 'reportes' },
  { href: '/bitacora', label: 'Bitácora', section: 'bitacora' },
]

export const NAV: Record<Role, { href: string; label: string; section: string }[]> = {
  KITCHEN: [{ href: '/cocina', label: 'Cocina', section: 'cocina' }],
  CASHIER: [
    { href: '/pos', label: 'POS', section: 'pos' },
    { href: '/cierre', label: 'Cierre', section: 'cierre' },
  ],
  PICKUP: [{ href: '/entrega', label: 'Entrega', section: 'entrega' }],
  SUPERVISOR: BUSINESS,
  ADMIN: [...BUSINESS, { href: '/equipo', label: 'Equipo', section: 'equipo' }, { href: '/local', label: 'Local', section: 'local' }],
}

export function homeFor(role: Role) {
  return STATIONS.find((station) => station.role === role)?.home || '/negocio'
}

export const ACCESS: Record<string, Role[]> = {
  '/cocina': ['KITCHEN'],
  '/pos': ['CASHIER'],
  '/cierre': ['CASHIER'],
  '/entrega': ['PICKUP'],
  '/negocio': ['ADMIN', 'SUPERVISOR'],
  '/admin': ['ADMIN', 'SUPERVISOR'],
  '/promos': ['ADMIN', 'SUPERVISOR'],
  '/inventario': ['ADMIN', 'SUPERVISOR'],
  '/reportes': ['ADMIN', 'SUPERVISOR'],
  '/bitacora': ['ADMIN', 'SUPERVISOR'],
  '/clientes': ['ADMIN', 'SUPERVISOR'],
  '/equipo': ['ADMIN'],
  '/local': ['ADMIN'],
}
