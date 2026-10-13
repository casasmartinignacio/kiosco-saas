'use client'

import { useEffect, useState } from 'react'
import { StaffNav } from '@/components/StaffNav'
import type { BoardOrder } from '@/lib/types'

const COLUMNS = [
  { status: 'PENDING', title: 'Pendientes', className: 'pending', action: 'Aceptar' },
  { status: 'ACCEPTED', title: 'Aceptados', className: 'pending', action: 'Preparar' },
  { status: 'PREPARING', title: 'En preparación', className: 'prep', action: 'Listo' },
  { status: 'READY', title: 'Listos', className: 'ready', action: '' },
] as const

function minutesSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

export default function CocinaPage() {
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [now, setNow] = useState('')
  const [clock, setClock] = useState(0)
  const [ticket, setTicket] = useState('')

  async function load() {
    const res = await fetch('/api/orders')
    if (res.ok) setOrders(await res.json())
  }

  useEffect(() => {
    load()
    const poll = setInterval(load, 3000)
    const tick = setInterval(() => {
      setClock((value) => value + 1)
      setNow(new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)
    setNow(new Date().toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' }))
    return () => {
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [])

  async function advance(id: string) {
    const res = await fetch(`/api/orders/${id}/advance`, { method: 'POST' })
    if (res.ok) load()
  }

  async function reprint(id: string) {
    const res = await fetch(`/api/orders/${id}/reprint`, { method: 'POST' })
    const data = await res.json().catch(() => null)
    if (res.ok) setTicket(data.ticket)
  }

  async function cancel(id: string) {
    const reason = window.prompt('Motivo de la cancelación')
    if (!reason?.trim()) return
    const res = await fetch(`/api/orders/${id}/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) load()
  }

  return (
    <div className="kds">
      <div className="kds-head">
        <b>Cocina</b>
        <div className="kds-links">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><img className="mark" src="/assets/logo-mark-light.png" alt="" /> Puerta Cuatro &nbsp; {now}</span>
          <StaffNav section="cocina" light />
        </div>
      </div>
      <div className="cols">
        {COLUMNS.map((column) => {
          const tickets = orders.filter((order) => order.status === column.status)
          return (
            <div className={`col ${column.className}`} key={column.status}>
              <div className="colhead">{column.title} ({tickets.length})</div>
              {tickets.map((order) => (
                <div className="ticket" key={order.id}>
                  <span className="timer">{minutesSince(order.createdAt)} min</span>
                  <b>#{order.number}</b>
                  <br />
                  <small>{order.terminalName}</small>
                  <br />
                  {order.items.map((item) => (
                    <span key={`${order.id}-${item.name}-${item.optionsLabel}-${item.note}`}>
                      {item.quantity > 1 ? `${item.quantity} × ` : ''}{item.name}
                      {item.optionsLabel ? <small> · {item.optionsLabel}</small> : null}
                      {item.note ? <small> · {item.note}</small> : null}
                      <br />
                    </span>
                  ))}
                  {order.beeperNumber ? <small>Llamar beeper {order.beeperNumber}</small> : null}
                  {column.action ? <button className="deliver" onClick={() => advance(order.id)}>{column.action}</button> : <div className="sub">En la pantalla de retiro</div>}
                  <button className="linkish" onClick={() => reprint(order.id)}>Reimprimir</button>
                  <button className="linkish" onClick={() => cancel(order.id)}>Cancelar</button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {ticket ? <pre className="ticket-preview">{ticket}</pre> : null}
      <span style={{ display: 'none' }}>{clock}</span>
    </div>
  )
}
