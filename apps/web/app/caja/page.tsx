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
  const [shiftOpen, setShiftOpen] = useState(false)
  const [opening, setOpening] = useState('')

  function loadShift() {
    fetch('/api/staff/shift').then(async (res) => {
      if (res.ok) setShiftOpen(Boolean(await res.json()))
    })
  }

  useEffect(() => {
    fetch('/api/catalog').then(async (res) => {
      if (res.ok) setCatalog(await res.json())
    })
    fetch('/api/caja').then(async (res) => {
      if (!res.ok) return
      const data = await res.json()
      setSummary(`${data.count} pedidos hoy · ${money(data.totalCrc)}`)
    })
    loadShift()
  }, [])

  function add(product: Product) {
    if (!product.available) return
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id)
      if (existing) return current.map((line) => (line.id === existing.id ? { ...line, quantity: line.quantity + 1 } : line))
      return [...current, { id: crypto.randomUUID(), product, quantity: 1 }]
    })
  }

  function price(product: Product) {
    const promo = catalog?.promotions.find((item) => item.productId === product.id)
    if (!promo) return product.priceCrc
    if (promo.kind === 'PERCENT') return Math.max(0, Math.round((product.priceCrc * (100 - promo.value)) / 100))
    return Math.max(0, product.priceCrc - promo.value)
  }

  const subtotal = lines.reduce((sum, line) => sum + price(line.product) * line.quantity, 0)
  const orderPromo = catalog?.promotions.find((item) => !item.productId)
  const discount = !orderPromo || subtotal <= 0 ? 0 : orderPromo.kind === 'PERCENT' ? Math.min(subtotal, Math.round((subtotal * orderPromo.value) / 100)) : Math.min(subtotal, orderPromo.value)
  const total = subtotal - discount

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
    loadShift()
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
          {orderPromo ? <div className="promo-banner">{orderPromo.name} · {orderPromo.kind === 'PERCENT' ? `${orderPromo.value}% en el pedido` : `${money(orderPromo.value)} en el pedido`}</div> : null}
          <div className="pos-grid">
            {catalog?.products.map((product) => {
              const now = price(product)
              const promo = catalog?.promotions.find((item) => item.productId === product.id)
              return (
              <button key={product.id} className="pos-item" disabled={!product.available} onClick={() => add(product)}>
                <b>{product.name}</b>
                <span>
                  {product.available && now < product.priceCrc ? <span className="price-was">{money(product.priceCrc)}</span> : null}
                  {product.available ? money(now) : 'Agotado'}
                </span>
                {product.available && promo && now < product.priceCrc ? <span className="promo-tag">{promo.name}</span> : null}
              </button>
              )
            })}
          </div>
        </div>
        <aside>
          <h2>Pedido</h2>
          {lines.length === 0 ? <div className="sub">Todavía no hay productos.</div> : null}
          {lines.map((line) => (
            <div className="pos-line" key={line.id}>
              <span>{line.quantity} × {line.product.name}</span>
              <b>{money(price(line.product) * line.quantity)}</b>
            </div>
          ))}
          {discount > 0 ? <div className="sub">{orderPromo?.name} -{money(discount)}</div> : null}
          <div className="total"><span>Total</span><b>{money(total)}</b></div>
          {!shiftOpen ? (
            <form className="sheet" onSubmit={async (event) => {
              event.preventDefault()
              const res = await fetch('/api/staff/shift/open', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ openingCashCrc: Number(opening || 0) }),
              })
              const data = await res.json().catch(() => null)
              if (!res.ok) setMessage(data?.message || 'No se pudo abrir la caja.')
              else { setMessage('Caja abierta.'); setShiftOpen(true) }
            }}>
              <div className="notice">Abre la caja antes de cobrar.</div>
              <input value={opening} inputMode="numeric" placeholder="Efectivo inicial" onChange={(event) => setOpening(event.target.value.replace(/\D/g, ''))} />
              <button className="btn primary" type="submit">Abrir caja</button>
            </form>
          ) : null}
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
          <button className="btn primary" disabled={lines.length === 0 || !shiftOpen} onClick={charge}>Cobrar y enviar a cocina</button>
          {message ? <div className="notice">{message}</div> : null}
          {ticket ? <pre className="ticket-preview">{ticket}</pre> : null}
        </aside>
      </div>
    </div>
  )
}
