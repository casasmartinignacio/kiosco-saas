'use client'

import { useEffect, useState } from 'react'
import { StaffNav } from '@/components/StaffNav'
import { money } from '@/lib/money'
import type { Catalog, Product } from '@/lib/types'

type Line = { id: string; product: Product; quantity: number }

export default function CajaPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [method, setMethod] = useState<'CARD' | 'SINPE' | 'CASH'>('CASH')
  const [beeper, setBeeper] = useState('')
  const [message, setMessage] = useState('')
  const [ticket, setTicket] = useState('')
  const [summary, setSummary] = useState('')

  useEffect(() => {
    fetch('/api/catalog').then(async (res) => {
      if (res.ok) setCatalog(await res.json())
    })
    fetch('/api/caja').then(async (res) => {
      if (!res.ok) return
      const data = await res.json()
      setSummary(`${data.count} pedidos hoy · ${money(data.totalCrc)}`)
    })
  }, [])

  function add(product: Product) {
    if (!product.available) return
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id)
      if (existing) return current.map((line) => (line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line))
      return [...current, { id: crypto.randomUUID(), product, quantity: 1 }]
    })
  }

  const total = lines.reduce((sum, line) => sum + line.product.priceCrc * line.quantity, 0)

  async function charge() {
    setMessage('')
    setTicket('')
    const res = await fetch('/api/caja', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: method,
        beeperNumber: beeper,
        idempotencyKey: crypto.randomUUID(),
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity, optionIds: [] })),
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setMessage(data?.message || 'No se pudo cobrar.')
      return
    }
    setTicket(data.ticket)
    setLines([])
    setBeeper('')
    setMessage(`Pedido #${data.number} enviado a cocina.`)
  }

  return (
    <div className="admin">
      <header className="staffbar">
        <div className="brand"><img className="mark" src="/assets/logo-mark.png" alt="" /> Puerta Cuatro</div>
        <StaffNav section="caja" />
      </header>
      <div className="pos">
        <div>
          <h1 style={{ fontSize: 28 }}>Caja 01</h1>
          <div className="sub">{summary}</div>
          <div className="pos-grid">
            {catalog?.products.map((product) => (
              <button key={product.id} className="pos-item" disabled={!product.available} onClick={() => add(product)}>
                <b>{product.name}</b>
                <span>{product.available ? money(product.priceCrc) : 'Agotado'}</span>
              </button>
            ))}
          </div>
        </div>
        <aside>
          <h2>Pedido</h2>
          {lines.length === 0 ? <div className="sub">Todavía no hay productos.</div> : null}
          {lines.map((line) => (
            <div className="pos-line" key={line.id}>
              <span>{line.quantity} × {line.product.name}</span>
              <b>{money(line.product.priceCrc * line.quantity)}</b>
            </div>
          ))}
          <div className="total"><span>Total</span><b>{money(total)}</b></div>
          <label className="sub">Beeper, si el cliente lleva uno
            <input value={beeper} inputMode="numeric" maxLength={3} onChange={(event) => setBeeper(event.target.value.replace(/\D/g, '').slice(0, 3))} />
          </label>
          <div className="seg" style={{ margin: '12px 0', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {(['CASH', 'CARD', 'SINPE'] as const).map((item) => (
              <button key={item} className={method === item ? 'sel' : ''} onClick={() => setMethod(item)}>
                {item === 'CASH' ? 'Efectivo' : item === 'CARD' ? 'Tarjeta' : 'SINPE'}
              </button>
            ))}
          </div>
          <button className="btn primary" disabled={lines.length === 0} onClick={charge}>Cobrar y enviar a cocina</button>
          {message ? <div className="notice">{message}</div> : null}
          {ticket ? <pre className="ticket-preview">{ticket}</pre> : null}
        </aside>
      </div>
    </div>
  )
}
