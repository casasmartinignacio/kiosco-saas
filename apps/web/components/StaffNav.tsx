'use client'

const FULL = [
  ['/cocina', 'Cocina', 'cocina'],
  ['/caja', 'Caja', 'caja'],
  ['/cierre', 'Cierre', 'cierre'],
  ['/entrega', 'Entrega', 'entrega'],
  ['/admin', 'Productos', 'productos'],
  ['/promos', 'Promos', 'promos'],
  ['/inventario', 'Inventario', 'inventario'],
  ['/clientes', 'Clientes', 'clientes'],
  ['/equipo', 'Equipo', 'equipo'],
  ['/reportes', 'Reportes', 'reportes'],
  ['/bitacora', 'Bitácora', 'bitacora'],
  ['/local', 'Local', 'local'],
] as const

const GROUPS = [
  { label: 'Operación', keys: ['cocina', 'caja', 'cierre', 'entrega'] },
  { label: 'Local', keys: ['productos', 'promos', 'inventario', 'clientes', 'equipo', 'reportes', 'bitacora', 'local'] },
] as const

export function StaffNav({ section, light }: { section: (typeof FULL)[number][2]; light?: boolean }) {
  async function salir() {
    await fetch('/api/salir', { method: 'POST' })
    window.location.href = '/acceso'
  }
  if (light) {
    const links = FULL.filter((item) => ['cocina', 'caja', 'entrega'].includes(item[2]))
    return (
      <nav className="kds-links">
        {links.map(([href, label, key]) => (
          <a key={key} className={section === key ? 'on' : ''} href={href}>{label}</a>
        ))}
        <a href="/listos">Listos</a>
        <button onClick={salir}>Salir</button>
      </nav>
    )
  }
  return (
    <div className="staff-groups">
      {GROUPS.map((group) => (
        <div className="staff-group" key={group.label}>
          <span>{group.label}</span>
          <nav>
            {FULL.filter((item) => (group.keys as readonly string[]).includes(item[2])).map(([href, label, key]) => (
              <a key={key} className={section === key ? 'on' : ''} href={href}>{label}</a>
            ))}
          </nav>
        </div>
      ))}
      <div className="staff-group">
        <span>Sesión</span>
        <nav><button onClick={salir}>Salir</button></nav>
      </div>
    </div>
  )
}
