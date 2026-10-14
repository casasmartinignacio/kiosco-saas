'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'
import { NAV, type Role } from '@/lib/session'

export default function NegocioPage() {
  const [links, setLinks] = useState<{ href: string; label: string }[]>([])

  useEffect(() => {
    fetch('/api/sesion').then(async (res) => {
      if (!res.ok) return
      const data = (await res.json()) as { role?: Role }
      if (!data.role) return
      setLinks(NAV[data.role].filter((item) => item.href !== '/negocio'))
    })
  }, [])

  return (
    <StaffPage title="Negocio" section="negocio">
      <div className="sub">Administración del local.</div>
      <div className="docs">
        {links.map((item) => (
          <a className="record" key={item.href} href={item.href}>{item.label}</a>
        ))}
      </div>
    </StaffPage>
  )
}
