'use client'

export function StaffNav({ section, light }: { section: 'cocina' | 'productos' | 'caja' | 'entrega'; light?: boolean }) {
  async function salir() {
    await fetch('/api/salir', { method: 'POST' })
    window.location.href = '/acceso'
  }
  return (
    <nav className={light ? 'kds-links' : undefined}>
      <a className={section === 'cocina' ? 'on' : ''} href="/cocina">Cocina</a>
      <a className={section === 'caja' ? 'on' : ''} href="/caja">Caja</a>
      <a className={section === 'entrega' ? 'on' : ''} href="/entrega">Entrega</a>
      <a href="/listos">Listos</a>
      <a className={section === 'productos' ? 'on' : ''} href="/admin">Productos</a>
      <button onClick={salir}>Salir</button>
    </nav>
  )
}
