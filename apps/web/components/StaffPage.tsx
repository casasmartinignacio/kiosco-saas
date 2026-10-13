'use client'

import type { ReactNode } from 'react'
import { StaffNav } from './StaffNav'

export function StaffPage({ title, section, children }: { title: string; section: Parameters<typeof StaffNav>[0]['section']; children: ReactNode }) {
  return (
    <div className="admin">
      <header className="staffbar">
        <div className="brand"><img className="mark" src="/assets/logo-mark.png" alt="" /> Puerta Cuatro</div>
        <StaffNav section={section} />
      </header>
      <div className="sheet-wrap">
        <h1 style={{ fontSize: 28 }}>{title}</h1>
        {children}
      </div>
    </div>
  )
}
