'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'

type Event = { id: string; action: string; actorName: string; detail: string; createdAt: string }

const LABELS: Record<string, string> = {
  ORDER_CREATED: 'Pedido creado',
  ORDER_STATUS: 'Estado',
  ORDER_DELIVERED: 'Entregado',
  ORDER_CANCELLED: 'Cancelado',
  TICKET_REPRINT: 'Reimpresión',
}

export default function BitacoraPage() {
  const [items, setItems] = useState<Event[]>([])

  useEffect(() => {
    fetch('/api/staff/audit').then(async (res) => {
      if (res.ok) setItems(await res.json())
    })
  }, [])

  return (
    <StaffPage title="Bitácora" section="bitacora">
      {items.map((item) => (
        <div className="sheet-row" key={item.id}>
          <span>{new Date(item.createdAt).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })}</span>
          <span>{LABELS[item.action] || item.action}</span>
          <span>{item.actorName || 'Kiosco'}</span>
          <span>{item.detail}</span>
        </div>
      ))}
    </StaffPage>
  )
}
