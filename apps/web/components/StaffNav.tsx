'use client'

export function StaffNav({ section, light }: { section: 'cocina' | 'productos'; light?: boolean }) {
  async function salir() {
    await fetch('/api/salir', { method: 'POST' })
    window.location.href = '/acceso'
  }
  return (
    <nav className={light ? 'kds-links' : undefined}>
      <a className={section === 'cocina' ? 'on' : ''} href="/cocina">Cocina</a>
      <a className={section === 'productos' ? 'on' : ''} href="/admin">Productos</a>
      <button onClick={salir}>Salir</button>
    </nav>
  )
}
