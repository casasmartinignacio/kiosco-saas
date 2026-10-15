'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'

type Event = { id: string; action: string; actorName: string; detail: string; orderNumber: number | null; createdAt: string }

const FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'shift', label: 'Caja' },
  { id: 'staff', label: 'Equipo' },
  { id: 'settings', label: 'Local' },
]

const LABELS: Record<string, string> = {
  ORDER_CREATED: 'Pedido creado',
  ORDER_STATUS: 'Estado del pedido',
  ORDER_DELIVERED: 'Pedido entregado',
  ORDER_CANCELLED: 'Pedido cancelado',
  TICKET_REPRINT: 'Comprobante reimpreso',
  SHIFT_OPENED: 'Caja abierta',
  SHIFT_CLOSED: 'Caja cerrada',
  STAFF_UPDATED: 'Equipo',
  SETTINGS_UPDATED: 'Local',
}

const STATUS: Record<string, string> = {
  PENDING: 'pendiente',
  ACCEPTED: 'aceptado',
  PREPARING: 'en preparación',
  READY: 'listo',
  DELIVERED: 'entregado',
  CANCELLED: 'cancelado',
}

function group(action: string) {
  if (action.startsWith('ORDER') || action === 'TICKET_REPRINT') return 'orders'
  if (action.startsWith('SHIFT')) return 'shift'
  if (action.startsWith('STAFF')) return 'staff'
  if (action.startsWith('SETTINGS')) return 'settings'
  return 'all'
}

function when(value: string) {
  return new Intl.DateTimeFormat('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value))
}

function describe(item: Event) {
  if (item.action === 'ORDER_STATUS') {
    const status = STATUS[item.detail] || item.detail
    return item.orderNumber ? `Pedido ${item.orderNumber} · ${status}` : status
  }
  if (item.orderNumber && /^#\d+$/.test(item.detail)) return `Pedido ${item.orderNumber}`
  return item.detail || (item.orderNumber ? `Pedido ${item.orderNumber}` : '')
}

export default function BitacoraPage() {
  const toast = useToast()
  const [items, setItems] = useState<Event[] | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/staff/audit').then(async (res) => {
      const data = await res.json().catch(() => null)
      if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo cargar la bitácora.' })
      else setItems(data)
    }).catch(() => toast({ variant: 'error', message: 'No se pudo cargar la bitácora.' }))
  }, [])

  const visible = (items || []).filter((item) => filter === 'all' || group(item.action) === filter)

  return (
    <StaffPage title="Bitácora" section="bitacora">
      <p className="range-note">Movimientos del local, del más reciente al más antiguo. La hora es de Costa Rica.</p>
      <div className="ranges">
        {FILTERS.map((item) => (
          <button key={item.id} type="button" className={item.id === filter ? 'on' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>
        ))}
      </div>
      {items && visible.length === 0 ? (
        <p className="sub">Todavía no hay movimientos{filter === 'all' ? '' : ' de este tipo'}. Acá quedan los pedidos, la caja, el equipo y los cambios del local.</p>
      ) : null}
      {visible.map((item) => (
        <div className="record log" key={item.id}>
          <div>
            <b>{LABELS[item.action] || item.action}</b>
            <div className="sub">{when(item.createdAt)} · {item.actorName || 'Kiosco'}</div>
          </div>
          <div>{describe(item)}</div>
        </div>
      ))}
    </StaffPage>
  )
}
