'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { StaffNav } from '@/components/StaffNav'
import { useToast } from '@/components/Toast'
import { CARD_TERMINAL_ENABLED, chargeCard, configureDevices, printReceipt, type StorePrinter } from '@/lib/devices'
import { money } from '@/lib/money'
import type { Catalog, Product } from '@/lib/types'

type Line = { id: string; product: Product; quantity: number }

export default function CajaPage() {
  const toast = useToast()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [category, setCategory] = useState('all')
  const [lines, setLines] = useState<Line[]>([])
  const [method, setMethod] = useState<'CARD' | 'SINPE' | 'CASH'>('CASH')
  const [receiptKind, setReceiptKind] = useState<'TICKET' | 'FACTURA'>('TICKET')
  const [customerName, setCustomerName] = useState('')
  const [customerTaxId, setCustomerTaxId] = useState('')
  const [beeper, setBeeper] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [ticket, setTicket] = useState('')
  const [summary, setSummary] = useState('')
  const [shiftOpen, setShiftOpen] = useState(false)
  const [opening, setOpening] = useState('')
  const [printers, setPrinters] = useState<StorePrinter[]>([])
  const [printer, setPrinter] = useState('')
  const [sending, setSending] = useState(false)
  const [view, setView] = useState<'venta' | 'documentos'>('venta')
  const [documents, setDocuments] = useState<{ id: string; number: number; createdAt: string; receiptKind: string; totalCrc: number; invoiceStatus: string; invoiceNumber: string; customerName: string }[]>([])

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
    fetch('/api/devices').then(async (res) => {
      if (!res.ok) return
      const data = await res.json()
      configureDevices(data)
      if (CARD_TERMINAL_ENABLED && data.terminalUrl) localStorage.setItem('kiosco-terminal-url', data.terminalUrl)
      setPrinters(data.printers || [])
      if (data.printers?.[0]) setPrinter(data.printers[0].host)
    })
    loadShift()
  }, [])

  async function loadDocuments() {
    const res = await fetch('/api/orders/documents')
    if (res.ok) setDocuments(await res.json())
  }

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
  const products = catalog?.products.filter((product) => category === 'all' || product.categoryId === category) || []

  async function charge() {
    if (receiptKind === 'FACTURA' && (!customerName.trim() || !customerTaxId.trim())) {
      setFieldError('Para la factura indica el nombre y la cédula.')
      toast({ variant: 'error', message: 'Para la factura indica el nombre y la cédula.' })
      return
    }
    if (beeper && !/^\d{3}$/.test(beeper)) {
      setFieldError('El beeper son 3 números.')
      toast({ variant: 'error', message: 'El beeper son 3 números.' })
      return
    }
    if (printers.length > 1 && !printer) {
      toast({ variant: 'error', message: 'Elige la impresora.' })
      return
    }
    setSending(true)
    setFieldError('')
    setTicket('')
    const key = crypto.randomUUID()
    const charged = await chargeCard(total, method, key)
    if (!charged.ok) {
      toast({ variant: 'error', message: charged.message || 'No se pudo cobrar.' })
      setSending(false)
      return
    }
    const res = await fetch('/api/caja', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: method,
        beeperNumber: beeper,
        idempotencyKey: key,
        receiptKind,
        customerName,
        customerTaxId,
        items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity, optionIds: [] })),
      }),
    })
    const data = await res.json().catch(() => null)
    setSending(false)
    if (!res.ok) {
      toast({ variant: 'error', message: data?.message || 'No se pudo cobrar.' })
      return
    }
    const printed = printReceipt({ text: data.ticket, html: data.ticketHtml || '', host: printer, prompt: true })
    setTicket(data.ticket)
    setLines([])
    setBeeper('')
    setCustomerName('')
    setCustomerTaxId('')
    const invoiceNote = data.invoiceStatus === 'SUBMITTED' ? (receiptKind === 'FACTURA' ? ' Factura enviada a Hacienda.' : ' Tiquete enviado a Hacienda.') : data.invoiceStatus === 'FAILED' || data.invoiceStatus === 'NOT_CONFIGURED' ? ` ${data.invoiceDetail}` : ''
    toast({ variant: 'success', message: `Pedido #${data.number} enviado a cocina.${printed ? '' : ' El comprobante quedó en pantalla.'}${invoiceNote}` })
    loadShift()
  }

  return (
    <div className="admin">
      <header className="staffbar">
        <div className="brand"><img className="mark" src="/assets/logo-mark.png" alt="" /> Puerta Cuatro</div>
        <StaffNav section="pos" />
      </header>
      <div className="pos">
        <div className="pos-menu">
          <div className="pos-title">
            <h1>POS</h1>
            <span>{summary}</span>
          </div>
          <div className="seg" style={{ maxWidth: 360, marginTop: 12 }}>
            <button className={view === 'venta' ? 'sel' : ''} onClick={() => setView('venta')}>Venta</button>
            <button className={view === 'documentos' ? 'sel' : ''} onClick={() => { setView('documentos'); loadDocuments() }}>Documentos</button>
          </div>
          {view === 'documentos' ? (
            <div className="docs">
              {documents.length === 0 ? <div className="sub">Todavía no hay comprobantes.</div> : null}
              {documents.map((doc) => (
                <article className="record" key={doc.id}>
                  <div>
                    <b>#{doc.number}</b>
                    <div className="sub">{doc.receiptKind === 'FACTURA' ? 'Factura' : 'Tiquete'} · {money(doc.totalCrc)} · {doc.invoiceStatus === 'SUBMITTED' ? 'Enviado' : doc.invoiceStatus === 'FAILED' ? 'Rechazado' : 'Sin envío'} · {new Date(doc.createdAt).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' })}</div>
                    <div className="sub">{doc.customerName || 'Sin nombre'}{doc.invoiceNumber ? ` · ${doc.invoiceNumber}` : ''}</div>
                  </div>
                  <button className="save" onClick={async () => {
                    const res = await fetch(`/api/orders/${doc.id}/reprint`, { method: 'POST' })
                    const data = await res.json().catch(() => null)
                    if (!res.ok) { toast({ variant: 'error', message: data?.message || 'No se pudo reimprimir.' }); return }
                    printReceipt({ text: data.ticket, html: data.ticketHtml || '', host: printer, prompt: true })
                    setTicket(data.ticket)
                    toast({ variant: 'success', message: `Comprobante #${doc.number} listo para imprimir.` })
                  }}>Imprimir</button>
                </article>
              ))}
            </div>
          ) : null}
          {view === 'venta' && orderPromo ? <div className="promo-banner">{orderPromo.name} · {orderPromo.kind === 'PERCENT' ? `${orderPromo.value}% en el pedido` : `${money(orderPromo.value)} en el pedido`}</div> : null}
          {view === 'venta' ? <>
          <div className="cats">
            <button className={category === 'all' ? 'cat active' : 'cat'} onClick={() => setCategory('all')}>Todos</button>
            {catalog?.categories.map((item) => (
              <button key={item.id} className={category === item.id ? 'cat active' : 'cat'} onClick={() => setCategory(item.id)}>{item.name}</button>
            ))}
          </div>
          <div className="pos-grid">
            {products.map((product) => {
              const now = price(product)
              return (
                <button key={product.id} className="pos-item" disabled={!product.available} onClick={() => add(product)}>
                  <img src={product.imageUrl} alt="" />
                  <b>{product.name}</b>
                  <span>
                    {product.available && now < product.priceCrc ? <span className="price-was">{money(product.priceCrc)}</span> : null}
                    {product.available ? money(now) : 'Agotado'}
                  </span>
                </button>
              )
            })}
          </div>
          </> : null}
        </div>
        <aside className="pos-cart">
          <h2>Pedido</h2>
          {lines.length === 0 ? <div className="sub">Toca un producto para agregarlo.</div> : null}
          {lines.map((line) => (
            <div className="pos-line" key={line.id}>
              <button className="round" aria-label="Quitar uno" onClick={() => setLines((current) => current.flatMap((item) => item.id === line.id ? item.quantity === 1 ? [] : [{ ...item, quantity: item.quantity - 1 }] : [item]))}>−</button>
              <span>{line.quantity} × {line.product.name}</span>
              <b>{money(price(line.product) * line.quantity)}</b>
            </div>
          ))}
          {discount > 0 ? <div className="sub">{orderPromo?.name} −{money(discount)}</div> : null}
          <div className="total"><span>Total</span><b>{money(total)}</b></div>
          {!shiftOpen ? (
            <form className="card form" onSubmit={async (event) => {
              event.preventDefault()
              const amount = Number(opening || 0)
              if (!Number.isInteger(amount) || amount < 0) {
                toast({ variant: 'error', message: 'El efectivo inicial no es válido.' })
                return
              }
              const res = await fetch('/api/staff/shift/open', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ openingCashCrc: amount }),
              })
              const data = await res.json().catch(() => null)
              if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo abrir la caja.' })
              else { toast({ variant: 'success', message: 'Caja abierta.' }); setShiftOpen(true) }
            }}>
              <p className="sub">Abre la caja antes de cobrar.</p>
              <Field label="Efectivo inicial" kind="digits" value={opening} onValue={setOpening} />
              <button className="btn primary" type="submit">Abrir caja</button>
            </form>
          ) : null}
          <div className="seg" style={{ marginTop: 12 }}>
            <button className={receiptKind === 'TICKET' ? 'sel' : ''} onClick={() => setReceiptKind('TICKET')}>Tiquete</button>
            <button className={receiptKind === 'FACTURA' ? 'sel' : ''} onClick={() => setReceiptKind('FACTURA')}>Factura</button>
          </div>
          {receiptKind === 'FACTURA' ? (
            <div className="sheet">
              <Field label="Nombre" value={customerName} error={fieldError && !customerName.trim() ? fieldError : ''} onValue={(next) => { setFieldError(''); setCustomerName(next) }} />
              <Field label="Cédula" value={customerTaxId} error={fieldError && !customerTaxId.trim() ? 'Indica la cédula.' : ''} onValue={(next) => { setFieldError(''); setCustomerTaxId(next) }} />
            </div>
          ) : null}
          <Field label="Beeper, si el cliente lleva uno" kind="digits" maxLength={3} hint="3 números, o vacío" value={beeper} error={fieldError === 'El beeper son 3 números.' ? fieldError : ''} onValue={(next) => { setFieldError(''); setBeeper(next) }} />
          {printers.length > 1 ? (
            <Field label="Impresora" kind="select" value={printer} onValue={setPrinter} options={printers.map((item) => ({ value: item.host, label: item.name }))} />
          ) : null}
          <div className="seg" style={{ margin: '12px 0', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {(['CASH', 'CARD', 'SINPE'] as const).map((item) => (
              <button key={item} className={method === item ? 'sel' : ''} onClick={() => setMethod(item)}>
                {item === 'CASH' ? 'Efectivo' : item === 'CARD' ? 'Tarjeta' : 'SINPE'}
              </button>
            ))}
          </div>
          <button className="btn primary" disabled={lines.length === 0 || !shiftOpen || sending} onClick={charge}>
            {sending ? 'Cobrando…' : 'Cobrar e imprimir'}
          </button>
          {ticket ? <pre className="ticket-preview">{ticket}</pre> : null}
        </aside>
      </div>
    </div>
  )
}
