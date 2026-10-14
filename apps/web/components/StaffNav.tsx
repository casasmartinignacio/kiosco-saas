'use client'

import { useEffect, useState } from 'react'
import { NAV, type Role } from '@/lib/session'

export function StaffNav({ section }: { section: string }) {
  const [role, setRole] = useState<Role | ''>('')

  useEffect(() => {
    fetch('/api/sesion').then(async (res) => {
      if (!res.ok) return
      const data = (await res.json()) as { role?: Role }
      if (data.role) setRole(data.role)
    })
  }, [])

  async function salir() {
    await fetch('/api/salir', { method: 'POST' })
    window.location.href = '/acceso'
  }

  const links = role ? NAV[role] : []

  return (
    <div className="nav-pills">
      {links.map((item) => (
        <a key={item.href} className={section === item.section ? 'on' : ''} href={item.href}>{item.label}</a>
      ))}
      <button className="nav-exit" type="button" onClick={salir}>Salir</button>
    </div>
  )
}
