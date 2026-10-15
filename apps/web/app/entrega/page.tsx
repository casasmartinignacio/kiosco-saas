'use client'

import { useState } from 'react'
import { Field } from '@/components/Field'
import { StaffNav } from '@/components/StaffNav'
import { useToast } from '@/components/Toast'
import { money } from '@/lib/money'

type Found = {
  id: string
  number: number
  status: string
  terminalName: string
  beeperNumber: string
  totalCrc: number
  items: { name: string; quantity: number; optionsLabel: string; note: string }[]
}

const STATUS: Record<string, string> = {
  PENDING: 'Pendiente',
  PREPARING: 'En preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
}

export default function EntregaPage() {
  const toast = useToast()
  const [number, setNumber] = useState('')
  const [order, setOrder] = useState<Found | null>(null)
  const [error, setError] = useState('')

  async function search(event: React.FormEvent) {
    event.preventDefault()
    if (!/^\d+$/.test(number.trim())) {
      setError('Escribe el número del pedido.')
      toast({ variant: 'error', message: 'Escribe el número del pedido.' })
      return
    }
    setError('')
    setOrder(null)
    const res = await fetch(`/api/entrega?number=${encodeURIComponent(number.trim())}`)
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      toast({ variant: 'error', message: data?.message || 'No encontramos ese pedido.' })
      return
    }
    setOrder(data)
  }

  async function deliver() {
    if (!order) return
    const res = await fetch('/api/entrega', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: order.id }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      toast({ variant: 'error', message: data?.message || 'No se pudo entregar.' })
      return
    }
    setOrder({ ...order, status: 'DELIVERED' })
    toast({ variant: 'success', message: `Pedido #${order.number} entregado.` })
  }

  return (
    <div className="admin">
      <header className="staffbar">
        <div className="brand"><img className="mark" src="/assets/logo-mark.png" alt="" /> Puerta Cuatro</div>
        <StaffNav section="entrega" />
      </header>
      <div className="sheet">
        <h1 style={{ fontSize: 28 }}>Entrega</h1>
        <p className="sub">El cliente presenta el ticket. Verifica el número antes de entregar.</p>
        <form className="lookup" onSubmit={search}>
          <Field grow kind="digits" ariaLabel="Número de pedido" placeholder="Número de pedido" value={number} error={error} onValue={(next) => { setError(''); setNumber(next) }} />
          <button className="save" type="submit">Buscar</button>
        </form>
        {order ? (
          <div className="lookup-card">
            <h2>Pedido #{order.number}</h2>
            <div className="sub">{order.terminalName} · {STATUS[order.status] || order.status}{order.beeperNumber ? ` · Beeper ${order.beeperNumber}` : ''}</div>
            {order.items.map((item) => (
              <div key={`${item.name}-${item.optionsLabel}-${item.note}`}>
                {item.quantity} × {item.name}
                {item.optionsLabel ? ` · ${item.optionsLabel}` : ''}
                {item.note ? ` · ${item.note}` : ''}
              </div>
            ))}
            <b>{money(order.totalCrc)}</b>
            {order.status === 'READY' ? <button className="btn primary" style={{ marginTop: 16 }} onClick={deliver}>Marcar como entregado</button> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
