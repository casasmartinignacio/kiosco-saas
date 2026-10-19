'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { Mods, optionNames } from '@/components/Mods'
import { Modal } from '@/components/Modal'
import { StaffNav } from '@/components/StaffNav'
import { useToast } from '@/components/Toast'
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
  const toast = useToast()
  const [orders, setOrders] = useState<BoardOrder[]>([])
  const [now, setNow] = useState('')
  const [clock, setClock] = useState(0)
  const [ticket, setTicket] = useState('')
  const [cancelId, setCancelId] = useState('')
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

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
    const data = await res.json().catch(() => null)
    if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo actualizar el pedido.' })
    else load()
  }

  async function reprint(id: string) {
    const res = await fetch(`/api/orders/${id}/reprint`, { method: 'POST' })
    const data = await res.json().catch(() => null)
    if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo reimprimir.' })
    else {
      setTicket(data.ticket)
      toast({ variant: 'success', message: 'Comprobante listo.' })
    }
  }

  async function cancel(event: React.FormEvent) {
    event.preventDefault()
    if (!reason.trim()) {
      setReasonError('Indica el motivo.')
      toast({ variant: 'error', message: 'Indica el motivo.' })
      return
    }
    const res = await fetch(`/api/orders/${cancelId}/cancel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo cancelar.' })
    else {
      toast({ variant: 'success', message: 'Pedido cancelado.' })
      setCancelId('')
      setReason('')
      load()
    }
  }

  return (
    <div className="kds">
      <header className="staffbar dark">
        <div className="brand"><img className="mark" src="/assets/logo-mark-light.png" alt="" /> Cocina</div>
        <span className="nav-clock">{now}</span>
        <StaffNav section="cocina" />
      </header>
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
                    <div key={`${order.id}-${item.name}-${item.optionsLabel}-${item.note}`}>
                      {item.quantity > 1 ? `${item.quantity} × ` : ''}{item.name}
                      <Mods items={optionNames(item.optionsLabel).map((name) => ({ name }))} />
                      {item.note ? <div className="option-note">{item.note}</div> : null}
                    </div>
                  ))}
                  {order.beeperNumber ? <small>Llamar beeper {order.beeperNumber}</small> : null}
                  {column.action ? <button className="deliver" onClick={() => advance(order.id)}>{column.action}</button> : <div className="sub">En la pantalla de retiro</div>}
                  <button className="ghost" onClick={() => reprint(order.id)}>Reimprimir</button>
                  <button className="danger" onClick={() => { setReason(''); setReasonError(''); setCancelId(order.id) }}>Cancelar</button>
                </div>
              ))}
            </div>
          )
        })}
      </div>
      {ticket ? <pre className="ticket-preview">{ticket}</pre> : null}
      {cancelId ? (
        <Modal title="Cancelar pedido" onClose={() => setCancelId('')}>
          <form className="form" onSubmit={cancel}>
            <Field label="Motivo" kind="textarea" value={reason} error={reasonError} onValue={(next) => { setReasonError(''); setReason(next) }} />
            <button className="danger" type="submit">Cancelar pedido</button>
          </form>
        </Modal>
      ) : null}
      <span style={{ display: 'none' }}>{clock}</span>
    </div>
  )
}
