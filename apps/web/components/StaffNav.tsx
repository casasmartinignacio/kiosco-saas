'use client'

import { useEffect, useState } from 'react'

const SERVICE = [
  ['/cocina', 'Cocina', 'cocina'],
  ['/caja', 'Caja', 'caja'],
  ['/entrega', 'Entrega', 'entrega'],
  ['/cierre', 'Cierre', 'cierre'],
  ['/listos', 'Listos', 'listos'],
] as const

const MORE = [
  ['/admin', 'Productos', 'productos'],
  ['/promos', 'Promos', 'promos'],
  ['/inventario', 'Inventario', 'inventario'],
  ['/clientes', 'Clientes', 'clientes'],
  ['/equipo', 'Equipo', 'equipo'],
  ['/reportes', 'Reportes', 'reportes'],
  ['/bitacora', 'Bitácora', 'bitacora'],
  ['/local', 'Local', 'local'],
] as const

export function StaffNav({ section }: { section: (typeof SERVICE | typeof MORE)[number][2] }) {
  const [open, setOpen] = useState(false)
  const moreOn = MORE.some((item) => item[2] === section)

  useEffect(() => {
    if (!open) return
    function close(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('.nav-more') && !target.closest('.nav-panel')) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])

  async function salir() {
    await fetch('/api/salir', { method: 'POST' })
    window.location.href = '/acceso'
  }

  return (
    <div className="nav-pills">
      {SERVICE.map(([href, label, key]) => (
        <a key={key} className={section === key ? 'on' : ''} href={href}>{label}</a>
      ))}
      <button className={moreOn || open ? 'nav-more on' : 'nav-more'} type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Más
      </button>
      <button className="nav-exit" type="button" onClick={salir}>Salir</button>
      {open ? (
        <div className="nav-panel">
          {MORE.map(([href, label, key]) => (
            <a key={key} className={section === key ? 'on' : ''} href={href}>{label}</a>
          ))}
        </div>
      ) : null}
    </div>
  )
}
