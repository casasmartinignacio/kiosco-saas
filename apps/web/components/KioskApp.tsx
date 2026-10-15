'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Field } from '@/components/Field'
import { useToast } from '@/components/Toast'
import { chargeCard, configureDevices, printReceipt } from '@/lib/devices'
import { money } from '@/lib/money'
import type { Catalog, Line, PlacedOrder, Product, Promotion } from '@/lib/types'

type Screen = 'home' | 'qr' | 'menu' | 'detail' | 'cart' | 'pay' | 'processing' | 'beeper' | 'success' | 'ready'
type PayMethod = 'CARD' | 'SINPE' | 'CASH'

const CHIPS = ['Hamburguesas', 'Pizzas', 'Bebidas', 'Postres']

function defaultOptionIds(product: Product, extras: boolean) {
  const ids: string[] = []
  for (const group of product.groups) {
    if (group.selection === 'single') {
      const chosen = group.options.find((option) => option.selectedByDefault) || group.options[0]
      if (chosen) ids.push(chosen.id)
    } else if (extras) {
      ids.push(...group.options.filter((option) => option.selectedByDefault).map((option) => option.id))
    }
  }
  return ids
}

function unitPrice(product: Product, optionIds: string[], promotions: Promotion[]) {
  const extra = product.groups
    .flatMap((group) => group.options)
    .filter((option) => optionIds.includes(option.id))
    .reduce((sum, option) => sum + option.priceCrc, 0)
  const base = product.priceCrc + extra
  const promo = promotions.find((item) => item.productId === product.id)
  if (!promo) return base
  if (promo.kind === 'PERCENT') return Math.max(0, Math.round((base * (100 - promo.value)) / 100))
  return Math.max(0, base - promo.value)
}

function listedOffer(product: Product, promotions: Promotion[]) {
  const promo = promotions.find((item) => item.productId === product.id)
  if (!promo) return null
  const price = promo.kind === 'PERCENT'
    ? Math.max(0, Math.round((product.priceCrc * (100 - promo.value)) / 100))
    : Math.max(0, product.priceCrc - promo.value)
  if (price >= product.priceCrc) return null
  return { name: promo.name, price }
}

function orderCut(subtotal: number, promotions: Promotion[]) {
  const promo = promotions.find((item) => !item.productId)
  if (!promo || subtotal <= 0) return { discount: 0, name: '' }
  const discount = promo.kind === 'PERCENT' ? Math.min(subtotal, Math.round((subtotal * promo.value) / 100)) : Math.min(subtotal, promo.value)
  return { discount, name: discount > 0 ? promo.name : '' }
}

function optionsLabel(product: Product, optionIds: string[]) {
  return product.groups
    .flatMap((group) => group.options)
    .filter((option) => optionIds.includes(option.id) && option.priceCrc > 0)
    .map((option) => option.name)
    .join(', ')
}

function Icon({ name, size = 22 }: { name: 'plus' | 'minus' | 'cart' | 'trash' | 'back' | 'chef' | 'card' | 'phone' | 'cash' | 'chevron' | 'check' | 'clock' | 'bell' | 'scan'; size?: number }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {name === 'plus' && <path fill="currentColor" d="M11 4.5h2v15h-2zM4.5 11h15v2h-15z" />}
      {name === 'minus' && <path fill="currentColor" d="M4.5 11h15v2h-15z" />}
      {name === 'back' && <path {...stroke} d="M15 5 8 12l7 7" />}
      {name === 'chevron' && <path {...stroke} d="m9 5 7 7-7 7" />}
      {name === 'cart' && <path {...stroke} d="M4 6h2l1.5 9h10l1.5-6H8M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />}
      {name === 'trash' && <path {...stroke} d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12" />}
      {name === 'chef' && <path {...stroke} d="M8 14c0-3 1.5-5 4-5s4 2 4 5M7 14h10v2a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-2Zm1-6a2 2 0 1 1 0-4 3 3 0 0 1 4 0 3 3 0 0 1 4 0 2 2 0 1 1 0 4" />}
      {name === 'card' && <path {...stroke} d="M4 8h16v9H4zM4 11h16" />}
      {name === 'phone' && <path {...stroke} d="M8 4h8v16H8zM11 17h2" />}
      {name === 'cash' && <path {...stroke} d="M4 8h16v8H4zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />}
      {name === 'check' && <path {...stroke} d="m5 12 5 5L20 7" />}
      {name === 'clock' && <path {...stroke} d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />}
      {name === 'bell' && <path {...stroke} d="M6 16h12l-1.2-2.2A6 6 0 0 1 16 10V9a4 4 0 0 0-8 0v1a6 6 0 0 1-.8 3.8L6 16Zm4 2a2 2 0 0 0 4 0" />}
      {name === 'scan' && <path {...stroke} d="M7 4H5v4M17 4h2v4M7 20H5v-4M17 20h2v-4M4 12h16" />}
    </svg>
  )
}

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="brand">
      <img className="mark" src={light ? '/assets/logo-mark-light.png' : '/assets/logo-mark.png'} alt="" />
      Puerta Cuatro
    </div>
  )
}

function CartButton({ count, onOpen }: { count: number; onOpen?: () => void }) {
  return (
    <button className="carticon" onClick={onOpen} aria-label="Carrito">
      <Icon name="cart" size={26} />
      {count > 0 && <span className="badge">{count}</span>}
    </button>
  )
}

export function KioskApp() {
  const toast = useToast()
  const frame = useRef<HTMLDivElement>(null)
  const [frameWidth, setFrameWidth] = useState(430)
  const [scale, setScale] = useState(1)
  const [screen, setScreen] = useState<Screen>('home')
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogError, setCatalogError] = useState(false)
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState<Line[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [optionIds, setOptionIds] = useState<string[]>([])
  const [qty, setQty] = useState(1)
  const [payMethod, setPayMethod] = useState<PayMethod>('CARD')
  const [beeper, setBeeper] = useState('')
  const [sending, setSending] = useState(false)
  const [order, setOrder] = useState<PlacedOrder | null>(null)
  const [note, setNote] = useState('')
  const [receiptKind, setReceiptKind] = useState<'TICKET' | 'FACTURA'>('TICKET')
  const [customerName, setCustomerName] = useState('')
  const [customerTaxId, setCustomerTaxId] = useState('')
  const [cardCode, setCardCode] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardError, setCardError] = useState('')
  const [facturaError, setFacturaError] = useState('')
  const [printed, setPrinted] = useState(false)
  const sendingRef = useRef(false)
  const idempotencyKey = useRef('')

  useEffect(() => {
    const fit = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (vw <= 0 || vh <= 0) return
      const designRatio = 430 / 860
      const width = vw / vh > designRatio ? Math.round(860 * (vw / vh)) : 430
      const next = Math.min(vw / width, vh / 860)
      setFrameWidth(width)
      setScale(next > 0 ? next : 1)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  async function loadCatalog() {
    setCatalogError(false)
    try {
      const res = await fetch('/api/catalog')
      if (!res.ok) throw new Error()
      setCatalog(await res.json())
    } catch {
      setCatalogError(true)
      toast({ variant: 'error', message: 'No hay conexión. Intenta de nuevo.' })
    }
  }

  useEffect(() => {
    loadCatalog()
    fetch('/api/devices').then(async (res) => {
      if (res.ok) configureDevices(await res.json())
    })
  }, [])

  const count = cart.reduce((sum, line) => sum + line.quantity, 0)
  const subtotal = cart.reduce((sum, line) => sum + line.unitPriceCrc * line.quantity, 0)
  const cut = orderCut(subtotal, catalog?.promotions || [])
  const menuPromo = catalog?.promotions.find((item) => !item.productId)
  const total = subtotal - cut.discount
  const chips = CHIPS.map((name) => catalog?.categories.find((item) => item.name === name)).filter((item) => !!item)
  const visible = useMemo(() => {
    if (!catalog) return []
    if (category === 'all') return catalog.products
    return catalog.products.filter((item) => item.categoryId === category)
  }, [catalog, category])

  function addLine(item: Product, ids: string[], quantity: number, lineNote = '') {
    setCart((current) => {
      const key = [...ids].sort().join(',')
      const existing = current.find((line) => line.productId === item.id && [...line.optionIds].sort().join(',') === key)
      if (existing) {
        return current.map((line) => (line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line))
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          productId: item.id,
          name: item.name,
          imageUrl: item.imageUrl,
          quantity,
          unitPriceCrc: unitPrice(item, ids, catalog?.promotions || []),
          optionsLabel: optionsLabel(item, ids),
          optionIds: ids,
          note: lineNote,
        },
      ]
    })
  }

  function openProduct(item: Product) {
    setProduct(item)
    setOptionIds(defaultOptionIds(item, true))
    setQty(1)
    setNote('')
    setScreen('detail')
  }

  function toggleOption(groupId: string, optionId: string, selection: 'single' | 'multi') {
    if (!product) return
    const group = product.groups.find((item) => item.id === groupId)
    if (!group) return
    if (selection === 'single') {
      const others = group.options.map((option) => option.id)
      setOptionIds((current) => [...current.filter((id) => !others.includes(id)), optionId])
      return
    }
    setOptionIds((current) => (current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId]))
  }

  async function startPay(method: PayMethod) {
    if (receiptKind === 'FACTURA' && (!customerName.trim() || !customerTaxId.trim())) {
      setFacturaError('Para la factura indica el nombre y la cédula.')
      toast({ variant: 'error', message: 'Para la factura indica el nombre y la cédula.' })
      return
    }
    setPayMethod(method)
    setFacturaError('')
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()
    setScreen('processing')
    const started = Date.now()
    const charged = await chargeCard(total, method, idempotencyKey.current)
    const ok = charged.ok
    const wait = Math.max(0, 1600 - (Date.now() - started))
    await new Promise((resolve) => setTimeout(resolve, wait))
    if (!ok) {
      toast({ variant: 'error', message: charged.message || 'No se pudo completar el pago. Intenta de nuevo.' })
      setScreen('pay')
      return
    }
    setBeeper('')
    setScreen('beeper')
  }

  async function placeOrder() {
    if (sendingRef.current || beeper.length !== 3) return
    sendingRef.current = true
    setSending(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payMethod,
          beeperNumber: beeper,
          idempotencyKey: idempotencyKey.current,
          receiptKind,
          customerName: receiptKind === 'FACTURA' ? customerName : cardName,
          customerTaxId,
          customerCode: cardCode,
          items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity, optionIds: line.optionIds, note: line.note })),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast({ variant: 'error', message: data?.message || 'No se pudo enviar el pedido.' })
        return
      }
      const placed = data as PlacedOrder
      setOrder(placed)
      const sent = placed.ticket ? printReceipt({ text: placed.ticket, html: placed.ticketHtml || '', prompt: false }) : false
      setPrinted(sent)
      idempotencyKey.current = ''
      setScreen('success')
    } catch {
      const payload = {
        paymentMethod: payMethod,
        beeperNumber: beeper,
        idempotencyKey: idempotencyKey.current,
        receiptKind,
        customerName: receiptKind === 'FACTURA' ? customerName : cardName,
        customerTaxId,
        customerCode: cardCode,
        items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity, optionIds: line.optionIds, note: line.note })),
      }
      const queued = JSON.parse(localStorage.getItem('kiosk-queue') || '[]') as unknown[]
      queued.push(payload)
      localStorage.setItem('kiosk-queue', JSON.stringify(queued))
      toast({ variant: 'info', message: 'No hay conexión. Guardamos el pedido y lo enviaremos al volver.' })
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  useEffect(() => {
    let stopped = false
    async function flush() {
      const raw = localStorage.getItem('kiosk-queue')
      if (!raw) return
      let queue: { idempotencyKey?: string }[] = []
      try {
        queue = JSON.parse(raw)
      } catch {
        return
      }
      const left: typeof queue = []
      for (const item of queue) {
        try {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(item),
          })
          if (!res.ok && res.status >= 500) left.push(item)
          else if (res.ok && item.idempotencyKey && item.idempotencyKey === idempotencyKey.current) {
            setOrder(await res.json())
            setPrinted(false)
            idempotencyKey.current = ''
            setScreen('success')
          }
        } catch {
          left.push(item)
        }
      }
      if (!stopped) localStorage.setItem('kiosk-queue', JSON.stringify(left))
    }
    flush()
    const timer = window.setInterval(flush, 8000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [])

  function newOrder() {
    setCart([])
    setOrder(null)
    setBeeper('')
    setNote('')
    setReceiptKind('TICKET')
    setCustomerName('')
    setCustomerTaxId('')
    setCardCode('')
    setCardName('')
    setCardError('')
    setFacturaError('')
    setPrinted(false)
    setCategory('all')
    setScreen('home')
  }

  useEffect(() => {
    if (screen === 'home' || screen === 'processing') return
    const wait = screen === 'success' || screen === 'ready' ? 25 : catalog?.idleSeconds || 90
    const timer = window.setTimeout(newOrder, wait * 1000)
    return () => window.clearTimeout(timer)
  }, [screen, catalog?.idleSeconds, cart, beeper, note])

  const detailPrice = product ? unitPrice(product, optionIds, catalog?.promotions || []) * qty : 0
  const waitLine = payMethod === 'SINPE' ? 'Confirma el pago en tu celular' : payMethod === 'CASH' ? 'Entrega el efectivo en caja' : 'No retires tu tarjeta'

  return (
    <div className="stage">
      <div style={{ width: frameWidth * scale, height: 860 * scale }}>
        <div className="frame" ref={frame} style={{ width: frameWidth, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <section className={screen === 'home' ? 'screen active' : 'screen'}>
            <div className="hero">
              <div className="hero-inner">
                <div className="brand" style={{ width: '100%' }}>
                  <img className="mark" src="/assets/logo-mark-light.png" alt="" />
                  Puerta Cuatro
                  <span style={{ marginLeft: 'auto', fontSize: 14 }}>ES</span>
                </div>
                <h1>Bienvenido</h1>
                <div className="sub">Pide, paga y disfruta</div>
                <div className="feature-row">
                  <div className="feature"><b><Icon name="clock" size={26} /></b>Rápido</div>
                  <div className="feature"><b><Icon name="check" size={26} /></b>Seguro</div>
                  <div className="feature"><b><Icon name="bell" size={26} /></b>Sin filas</div>
                </div>
                <button className="btn primary" onClick={() => setScreen('qr')}>Comenzar</button>
                <button className="scan-card" onClick={() => setScreen('qr')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon name="scan" size={22} />
                    <span>Tarjeta de cliente<br /><span style={{ fontWeight: 500 }}>escribe el código para identificarla</span></span>
                    <Icon name="chevron" size={20} />
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className={screen === 'qr' ? 'screen active' : 'screen'}>
            <div className="top">
              <button className="back" aria-label="Atrás" onClick={() => setScreen('home')}><Icon name="back" /></button>
              <Brand />
            </div>
            <div className="body">
              <div className="qrpanel">
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <h1>Tarjeta de cliente</h1>
                  <div className="sub">Escribe el código de tu tarjeta</div>
                </div>
                <Field size="lg" kind="code" ariaLabel="Código de tarjeta" placeholder="Código" value={cardCode} error={cardError} onValue={(next) => { setCardError(''); setCardCode(next) }} />
                <button className="btn primary" style={{ marginTop: 14 }} disabled={!cardCode.trim()} onClick={async () => {
                  const res = await fetch(`/api/customers/${encodeURIComponent(cardCode.trim())}`)
                  const data = await res.json().catch(() => null)
                  if (!res.ok) {
                    setCardName('')
                    const message = data?.message || 'No encontramos esa tarjeta.'
                    setCardError(message)
                    toast({ variant: 'error', message })
                    return
                  }
                  setCardName(data.name)
                  setCardCode(data.code)
                  setScreen('menu')
                }}>Usar tarjeta</button>
                <div style={{ textAlign: 'center', margin: '8px 0 12px', fontSize: 16 }}>También puedes continuar sin tarjeta</div>
                <button className="btn secondary" onClick={() => { setCardCode(''); setCardName(''); setScreen('menu') }}>Continuar sin tarjeta</button>
              </div>
            </div>
          </section>

          <section className={screen === 'menu' ? 'screen active' : 'screen'}>
            <div className="top">
              <Brand />
              <CartButton count={count} onOpen={() => setScreen('cart')} />
            </div>
            <div className="menu-body">
              {menuPromo ? (
                <div className="promo-banner">
                  {menuPromo.name} · {menuPromo.kind === 'PERCENT' ? `${menuPromo.value}% en el pedido` : `${money(menuPromo.value)} en el pedido`}
                </div>
              ) : null}
              <div className="cats">
                <button className={category === 'all' ? 'cat active' : 'cat'} onClick={() => setCategory('all')}>Todos</button>
                {chips.map((item) => (
                  <button key={item.id} className={category === item.id ? 'cat active' : 'cat'} onClick={() => setCategory(item.id)}>
                    {item.name}
                  </button>
                ))}
              </div>
              {catalogError ? <button className="btn primary" style={{ margin: '12px 16px' }} onClick={loadCatalog}>Reintentar</button> : null}
              <div className="menu-scroll">
              <div className="products">
                {visible.map((item) => {
                  const offer = listedOffer(item, catalog?.promotions || [])
                  return (
                  <button key={item.id} className="product" onClick={() => openProduct(item)}>
                    <img src={item.imageUrl} alt="" />
                    <div className="pinfo">
                      <b>{item.name}</b>
                      <span className="price">
                        {offer ? <span className="price-was">{money(item.priceCrc)}</span> : null}
                        {money(offer ? offer.price : item.priceCrc)}
                      </span>
                      {offer ? <span className="promo-tag">{offer.name}</span> : null}
                      <span
                        className="padd"
                        role="button"
                        aria-label={`Agregar ${item.name}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          if (!item.available) return
                          addLine(item, defaultOptionIds(item, false), 1)
                        }}
                      >
                        <Icon name="plus" size={20} />
                      </span>
                    </div>
                  </button>
                  )
                })}
              </div>
              </div>
              <div className="cartbar">
                <button className="btn primary" onClick={() => setScreen('cart')}>Ver carrito · {money(total)}</button>
              </div>
            </div>
          </section>

          <section className={screen === 'detail' ? 'screen active' : 'screen'}>
            <div className="top">
              <button className="back" aria-label="Atrás" onClick={() => setScreen('menu')}><Icon name="back" /></button>
              <Brand />
              <CartButton count={count} onOpen={() => setScreen('cart')} />
            </div>
            {product && (
              <div className="body">
                <img className="detail-img" src={product.imageUrl} alt="" />
                <h1 style={{ fontSize: 28 }}>
                  {product.name}
                  <br />
                  <span className="orange">
                    {listedOffer(product, catalog?.promotions || []) ? <span className="price-was">{money(product.priceCrc)}</span> : null}
                    {money(listedOffer(product, catalog?.promotions || [])?.price ?? product.priceCrc)}
                  </span>
                </h1>
                {listedOffer(product, catalog?.promotions || []) ? <span className="promo-tag">{listedOffer(product, catalog?.promotions || [])?.name}</span> : null}
                <div className="sub">{product.description}</div>
                {product.groups.length > 0 && <h2>Personaliza tu pedido</h2>}
                {product.groups.map((group) => (
                  <div key={group.id}>
                    <b style={{ fontSize: 16 }}>{group.name}</b>
                    {group.selection === 'single' ? (
                      <div className="seg" style={{ margin: '7px 0 12px' }}>
                        {group.options.map((option) => (
                          <button key={option.id} className={optionIds.includes(option.id) ? 'sel' : ''} onClick={() => toggleOption(group.id, option.id, 'single')}>
                            {option.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      group.options.map((option) => (
                        <label className="check" key={option.id}>
                          <input type="checkbox" checked={optionIds.includes(option.id)} onChange={() => toggleOption(group.id, option.id, 'multi')} />
                          <span style={{ flex: 1 }}>{option.name}</span>
                          <b>{money(option.priceCrc)}</b>
                        </label>
                      ))
                    )}
                  </div>
                ))}
                <Field label="Observación" placeholder="Sin cebolla, término medio..." value={note} onValue={setNote} />
                <div className="detail-actions">
                  <div className="qty">
                    <button aria-label="Quitar uno" onClick={() => setQty((value) => Math.max(1, value - 1))}><Icon name="minus" size={18} /></button>
                    <b>{qty}</b>
                    <button aria-label="Agregar uno" onClick={() => setQty((value) => Math.min(20, value + 1))}><Icon name="plus" size={18} /></button>
                  </div>
                  <button
                    className="btn primary"
                    onClick={() => {
                      addLine(product, optionIds, qty, note)
                      setScreen('menu')
                    }}
                  >
                    Agregar al carrito
                    <br />
                    {money(detailPrice)}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className={screen === 'cart' ? 'screen active' : 'screen'}>
            <div className="top">
              <button className="back" aria-label="Atrás" onClick={() => setScreen('menu')}><Icon name="back" /></button>
              <Brand />
              <CartButton count={count} onOpen={() => setScreen('cart')} />
            </div>
            <div className="body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Tu carrito</h2>
                {cart.length > 0 && <button className="danger" onClick={() => setCart([])}>Vaciar</button>}
              </div>
              {cart.length === 0 && (
                <div className="center" style={{ height: 'auto', padding: '48px 0' }}>
                  <div className="sub">Todavía no agregas productos</div>
                  <button className="btn primary" style={{ marginTop: 16 }} onClick={() => setScreen('menu')}>Ver el menú</button>
                </div>
              )}
              {cart.map((line) => (
                <div className="cartrow" key={line.id}>
                  <img src={line.imageUrl} alt="" />
                  <div>
                    <b>{line.name}</b>
                    {line.optionsLabel && <><br /><small>{line.optionsLabel}</small></>}
                    <div className="qtyline">
                      <button className="round" aria-label="Quitar uno" onClick={() => setCart((current) => current.flatMap((item) => item.id === line.id ? item.quantity === 1 ? [] : [{ ...item, quantity: item.quantity - 1 }] : [item]))}><Icon name="minus" size={18} /></button>
                      <span>{line.quantity}</span>
                      <button className="round" aria-label="Agregar uno" onClick={() => setCart((current) => current.map((item) => item.id === line.id ? { ...item, quantity: item.quantity + 1 } : item))}><Icon name="plus" size={18} /></button>
                      <span>{money(line.unitPriceCrc)}</span>
                    </div>
                  </div>
                  <button className="round" aria-label="Quitar" onClick={() => setCart((current) => current.filter((item) => item.id !== line.id))}><Icon name="trash" size={20} /></button>
                </div>
              ))}
              {cart.length > 0 && (
                <>
                  <div className="summary">
                    <div className="sumrow"><span>Subtotal</span><b>{money(subtotal)}</b></div>
                    {cut.discount > 0 ? <div className="sumrow"><span>{cut.name}</span><b>-{money(cut.discount)}</b></div> : null}
                    <div className="sumrow total"><span>Total</span><b>{money(total)}</b></div>
                  </div>
                  <button className="btn primary" style={{ marginTop: 18 }} onClick={() => setScreen('pay')}>Continuar al pago</button>
                </>
              )}
            </div>
          </section>

          <section className={screen === 'pay' ? 'screen active' : 'screen'}>
            <div className="top">
              <button className="back" aria-label="Atrás" onClick={() => setScreen('cart')}><Icon name="back" /></button>
              <Brand />
            </div>
            <div className="body">
              <div className="center" style={{ height: 'auto', paddingTop: 35 }}>
                <h1>Método de pago</h1>
                <div className="seg" style={{ width: '100%', marginTop: 16 }}>
                  <button className={receiptKind === 'TICKET' ? 'sel' : ''} onClick={() => setReceiptKind('TICKET')}>Tiquete electrónico</button>
                  <button className={receiptKind === 'FACTURA' ? 'sel' : ''} onClick={() => setReceiptKind('FACTURA')}>Factura electrónica</button>
                </div>
                {receiptKind === 'FACTURA' ? (
                  <div style={{ width: '100%', textAlign: 'left', marginTop: 12 }}>
                    <Field label="Nombre" value={customerName} error={facturaError && !customerName.trim() ? facturaError : ''} onValue={(next) => { setFacturaError(''); setCustomerName(next) }} />
                    <Field label="Cédula" value={customerTaxId} error={facturaError && !customerTaxId.trim() ? 'Indica la cédula.' : ''} onValue={(next) => { setFacturaError(''); setCustomerTaxId(next) }} />
                  </div>
                ) : null}
                <div style={{ width: '100%', marginTop: 15 }}>
                  <button className="payoption" onClick={() => startPay('CARD')}>
                    <div className="payicon"><Icon name="card" size={24} /></div>
                    <div><b>Tarjeta de crédito o débito</b><span>POS bancario</span></div>
                    <span style={{ marginLeft: 'auto' }}><Icon name="chevron" /></span>
                  </button>
                  <button className="payoption" onClick={() => startPay('SINPE')}>
                    <div className="payicon"><Icon name="phone" size={24} /></div>
                    <div><b>SINPE Móvil</b><span>Pago desde tu celular</span></div>
                    <span style={{ marginLeft: 'auto' }}><Icon name="chevron" /></span>
                  </button>
                  <button className="payoption" onClick={() => startPay('CASH')}>
                    <div className="payicon" style={{ background: '#dff7e8' }}><Icon name="cash" size={24} /></div>
                    <div><b>Efectivo</b><span>solo si está habilitado</span></div>
                  </button>
                </div>
                <div className="sub" style={{ marginTop: 45 }}>Pago seguro y confiable</div>
              </div>
            </div>
          </section>

          <section className={screen === 'processing' ? 'screen active' : 'screen'}>
            <div className="top"><Brand /></div>
            <div className="body">
              <div className="center">
                <h2>Procesando pago...</h2>
                <div className="spinner" />
                <div style={{ fontSize: 16 }}>Por favor espera<br />{waitLine}</div>
                <div className="sub" style={{ marginTop: 70 }}>Transacción segura</div>
              </div>
            </div>
          </section>

          <section className={screen === 'beeper' ? 'screen active' : 'screen'}>
            <div className="top"><Brand /></div>
            <div className="body">
              <div className="center" style={{ height: 'auto', paddingTop: 12 }}>
                <h1 style={{ fontSize: 26 }}>Número de beeper</h1>
                <div className="sub">Ingresa los 3 números</div>
                <div className="beepercode">{beeper || '—'}</div>
                <div className="keypad">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', ''].map((key) => (
                    <button
                      key={key || 'blank'}
                      disabled={!key}
                      onClick={() => {
                        if (key === 'borrar') setBeeper((value) => value.slice(0, -1))
                        else setBeeper((value) => (value.length >= 3 ? value : value + key))
                      }}
                    >
                      {key === 'borrar' ? <Icon name="back" size={22} /> : key}
                    </button>
                  ))}
                </div>
                <button className="btn primary" style={{ marginTop: 14 }} disabled={beeper.length !== 3 || sending} onClick={placeOrder}>
                  Continuar
                </button>
              </div>
            </div>
          </section>

          <section className={screen === 'success' ? 'screen active' : 'screen'}>
            <div className="top"><Brand /></div>
            <div className="body">
              <div className="center">
                <div className="success"><Icon name="check" size={36} /></div>
                <h1>¡Pago exitoso!</h1>
                <h2>Pedido #{order?.number}</h2>
                <div className="sub">Conserva este número para retirar tu pedido.</div>
                {printed ? <div className="sub">Enviamos el ticket a la impresora.</div> : <pre className="ticket-preview">{order?.ticket}</pre>}
                <div className="infoitem"><div className="ico"><Icon name="bell" size={20} /></div><div><b>Beeper #{order?.beeperNumber}</b><br />Te avisaremos cuando esté listo</div></div>
                <div className="infoitem"><div className="ico"><Icon name="clock" size={20} /></div><div><b>Tiempo estimado</b><br />10 - 15 minutos</div></div>
                <button className="btn primary" style={{ marginTop: 15 }} onClick={() => setScreen('ready')}>Ver mi pedido</button>
                <button className="btn secondary" style={{ marginTop: 8 }} onClick={newOrder}>Nueva orden</button>
              </div>
            </div>
          </section>

          <section className={screen === 'ready' ? 'screen active' : 'screen'}>
            <div className="top"><Brand /></div>
            <div className="body">
              <div className="center">
                <img className="beeperimg" src="/assets/beeper.jpg" alt="" />
                <h1>Beeper #{order?.beeperNumber}</h1>
                <div className="sub">Cuando tu pedido esté listo,<br />el beeper sonará y vibrará.</div>
                <div className="help">Puedes esperar en tu mesa<br />¡Gracias por tu compra!</div>
                <button className="btn secondary" style={{ marginTop: 16 }} onClick={newOrder}>Nueva orden</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
