'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { money } from '@/lib/money'
import type { Catalog, Line, PlacedOrder, Product } from '@/lib/types'

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

function unitPrice(product: Product, optionIds: string[]) {
  const extra = product.groups
    .flatMap((group) => group.options)
    .filter((option) => optionIds.includes(option.id))
    .reduce((sum, option) => sum + option.priceCrc, 0)
  return product.priceCrc + extra
}

function optionsLabel(product: Product, optionIds: string[]) {
  return product.groups
    .flatMap((group) => group.options)
    .filter((option) => optionIds.includes(option.id) && option.priceCrc > 0)
    .map((option) => option.name)
    .join(', ')
}

type Bridge = { pay: (payload: string) => string; printTicket: (payload: string) => string }

function bridge(): Bridge | null {
  const host = window as Window & { Kiosk?: Bridge }
  if (!host.Kiosk?.pay || !host.Kiosk?.printTicket) return null
  return host.Kiosk
}

export function KioskApp() {
  const frame = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [screen, setScreen] = useState<Screen>('home')
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogError, setCatalogError] = useState('')
  const [category, setCategory] = useState('all')
  const [cart, setCart] = useState<Line[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [optionIds, setOptionIds] = useState<string[]>([])
  const [qty, setQty] = useState(1)
  const [payMethod, setPayMethod] = useState<PayMethod>('CARD')
  const [payError, setPayError] = useState('')
  const [beeper, setBeeper] = useState('')
  const [beeperError, setBeeperError] = useState('')
  const [sending, setSending] = useState(false)
  const [order, setOrder] = useState<PlacedOrder | null>(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    const fit = () => {
      const next = Math.min(window.innerWidth / 430, window.innerHeight / 860)
      setScale(next > 0 ? next : 1)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  async function loadCatalog() {
    setCatalogError('')
    try {
      const res = await fetch('/api/catalog')
      if (!res.ok) throw new Error()
      setCatalog(await res.json())
    } catch {
      setCatalogError('No hay conexión. Intenta de nuevo.')
    }
  }

  useEffect(() => {
    loadCatalog()
  }, [])

  const count = cart.reduce((sum, line) => sum + line.quantity, 0)
  const total = cart.reduce((sum, line) => sum + line.unitPriceCrc * line.quantity, 0)
  const chips = CHIPS.map((name) => catalog?.categories.find((item) => item.name === name)).filter((item) => !!item)
  const visible = useMemo(() => {
    if (!catalog) return []
    if (category === 'all') return catalog.products
    return catalog.products.filter((item) => item.categoryId === category)
  }, [catalog, category])

  function addLine(item: Product, ids: string[], quantity: number) {
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
          unitPriceCrc: unitPrice(item, ids),
          optionsLabel: optionsLabel(item, ids),
          optionIds: ids,
        },
      ]
    })
  }

  function openProduct(item: Product) {
    setProduct(item)
    setOptionIds(defaultOptionIds(item, true))
    setQty(1)
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
    setPayMethod(method)
    setPayError('')
    setScreen('processing')
    const started = Date.now()
    let ok = true
    const device = bridge()
    if (device) {
      try {
        const result = JSON.parse(device.pay(JSON.stringify({ amountCrc: total, method }))) as { ok?: boolean }
        ok = result.ok !== false
      } catch {
        ok = false
      }
    }
    const wait = Math.max(0, 1600 - (Date.now() - started))
    await new Promise((resolve) => setTimeout(resolve, wait))
    if (!ok) {
      setPayError('No se pudo completar el pago. Intenta de nuevo.')
      setScreen('pay')
      return
    }
    setBeeper('')
    setBeeperError('')
    setScreen('beeper')
  }

  async function placeOrder() {
    if (sendingRef.current || beeper.length !== 3) return
    sendingRef.current = true
    setSending(true)
    setBeeperError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payMethod,
          beeperNumber: beeper,
          items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity, optionIds: line.optionIds })),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setBeeperError(data?.message || 'No se pudo enviar el pedido.')
        return
      }
      const placed = data as PlacedOrder
      setOrder(placed)
      const device = bridge()
      if (device) {
        try {
          device.printTicket(JSON.stringify(placed))
        } catch {
          /* the order is already placed */
        }
      }
      setScreen('success')
    } catch {
      setBeeperError('No hay conexión. Tu pedido no se envió.')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  function newOrder() {
    setCart([])
    setOrder(null)
    setBeeper('')
    setCategory('all')
    setScreen('home')
  }

  const detailPrice = product ? unitPrice(product, optionIds) * qty : 0
  const waitLine = payMethod === 'SINPE' ? 'Confirma el pago en tu celular' : payMethod === 'CASH' ? 'Entrega el efectivo en caja' : 'No retires tu tarjeta'

  return (
    <div className="stage">
      <div style={{ width: 430 * scale, height: 860 * scale }}>
        <div className="frame" ref={frame} style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <section className={screen === 'home' ? 'screen active' : 'screen'}>
            <div className="hero">
              <div className="hero-inner">
                <div className="brand">
                  <span className="chef">♨</span> MiRestaurante <span style={{ marginLeft: 'auto', fontSize: 11 }}>ES</span>
                </div>
                <h1>Bienvenido</h1>
                <div className="sub">Pide, paga y disfruta</div>
                <div className="feature-row">
                  <div className="feature"><b>◷</b>Rápido</div>
                  <div className="feature"><b>♢</b>Seguro</div>
                  <div className="feature"><b>◷</b>Sin filas</div>
                </div>
                <button className="btn primary" onClick={() => setScreen('qr')}>Comenzar ›</button>
                <button className="scan-card" onClick={() => setScreen('qr')}>
                  ▣ &nbsp; Escanea tu tarjeta
                  <br />
                  <span style={{ paddingLeft: 25 }}>para acumular puntos y obtener promociones</span> ›
                </button>
              </div>
            </div>
          </section>

          <section className={screen === 'qr' ? 'screen active' : 'screen'}>
            <div className="top">
              <button className="back" onClick={() => setScreen('home')}>‹</button>
              <div className="brand"><span className="chef">♨</span> MiRestaurante</div>
            </div>
            <div className="body">
              <div className="qrpanel">
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <h1>Escanea tu tarjeta<br />QR de cliente frecuente</h1>
                  <div className="sub">Acerca el código QR al lector</div>
                </div>
                <div className="scanframe"><img className="qr" src="/assets/qr.png" alt="" /></div>
                <div style={{ textAlign: 'center', margin: '8px 0 12px', fontSize: 12 }}>También puedes continuar sin tarjeta</div>
                <button className="btn secondary" onClick={() => setScreen('menu')}>Continuar sin tarjeta</button>
              </div>
            </div>
          </section>

          <section className={screen === 'menu' ? 'screen active' : 'screen'}>
            <div className="top">
              <div className="brand"><span className="chef">♨</span> MiRestaurante</div>
              <div className="carticon">🛒{count > 0 && <span className="badge">{count}</span>}</div>
            </div>
            <div className="body">
              <div className="cats">
                <button className={category === 'all' ? 'cat active' : 'cat'} onClick={() => setCategory('all')}>Todos</button>
                {chips.map((item) => (
                  <button key={item.id} className={category === item.id ? 'cat active' : 'cat'} onClick={() => setCategory(item.id)}>
                    {item.name}
                  </button>
                ))}
              </div>
              {catalogError && (
                <div className="notice">
                  {catalogError}
                  <button className="btn primary" style={{ marginTop: 10 }} onClick={loadCatalog}>Reintentar</button>
                </div>
              )}
              <div className="products">
                {visible.map((item) => (
                  <button key={item.id} className="product" onClick={() => openProduct(item)}>
                    <img src={item.imageUrl} alt="" />
                    <div className="pinfo">
                      <b>{item.name}</b>
                      <span>{money(item.priceCrc)}</span>
                      <span
                        className="padd"
                        onClick={(event) => {
                          event.stopPropagation()
                          addLine(item, defaultOptionIds(item, false), 1)
                        }}
                      >
                        +
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="cartbar">
                <button className="btn primary" onClick={() => setScreen('cart')}>Ver carrito · {money(total)}</button>
              </div>
            </div>
          </section>

          <section className={screen === 'detail' ? 'screen active' : 'screen'}>
            <div className="top">
              <button className="back" onClick={() => setScreen('menu')}>‹ Atrás</button>
              <div className="brand"><span className="chef">♨</span> MiRestaurante</div>
              <div className="carticon">🛒{count > 0 && <span className="badge">{count}</span>}</div>
            </div>
            {product && (
              <div className="body">
                <img className="detail-img" src={product.imageUrl} alt="" />
                <h1 style={{ fontSize: 21 }}>
                  {product.name}
                  <br />
                  <span className="orange">{money(product.priceCrc)}</span>
                </h1>
                <div className="sub">{product.description}</div>
                {product.groups.length > 0 && <h2>Personaliza tu pedido</h2>}
                {product.groups.map((group) => (
                  <div key={group.id}>
                    <b style={{ fontSize: 12 }}>{group.name}</b>
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
                <div className="detail-actions">
                  <div className="qty">
                    <button onClick={() => setQty((value) => Math.max(1, value - 1))}>−</button>
                    <b>{qty}</b>
                    <button onClick={() => setQty((value) => Math.min(20, value + 1))}>+</button>
                  </div>
                  <button
                    className="btn primary"
                    onClick={() => {
                      addLine(product, optionIds, qty)
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
              <button className="back" onClick={() => setScreen('menu')}>‹</button>
              <div className="brand"><span className="chef">♨</span> MiRestaurante</div>
              <div className="carticon">🛒{count > 0 && <span className="badge">{count}</span>}</div>
            </div>
            <div className="body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Tu carrito</h2>
                {cart.length > 0 && <button className="linkish" onClick={() => setCart([])}>Vaciar</button>}
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
                      <button onClick={() => setCart((current) => current.flatMap((item) => item.id === line.id ? item.quantity === 1 ? [] : [{ ...item, quantity: item.quantity - 1 }] : [item]))}>−</button>
                      <span>{line.quantity}</span>
                      <button onClick={() => setCart((current) => current.map((item) => item.id === line.id ? { ...item, quantity: item.quantity + 1 } : item))}>+</button>
                      <span>{money(line.unitPriceCrc)}</span>
                    </div>
                  </div>
                  <button aria-label="Quitar" onClick={() => setCart((current) => current.filter((item) => item.id !== line.id))}>🗑</button>
                </div>
              ))}
              {cart.length > 0 && (
                <>
                  <div className="summary">
                    <div className="sumrow"><span>Subtotal</span><b>{money(total)}</b></div>
                    <div className="sumrow total"><span>Total</span><b>{money(total)}</b></div>
                  </div>
                  <button className="btn primary" style={{ marginTop: 18 }} onClick={() => { setPayError(''); setScreen('pay') }}>Continuar al pago</button>
                </>
              )}
            </div>
          </section>

          <section className={screen === 'pay' ? 'screen active' : 'screen'}>
            <div className="top">
              <button className="back" onClick={() => setScreen('cart')}>‹ Atrás</button>
              <div className="brand"><span className="chef">♨</span> MiRestaurante</div>
            </div>
            <div className="body">
              <div className="center" style={{ height: 'auto', paddingTop: 35 }}>
                <h1>Método de pago</h1>
                {payError && <div className="notice">{payError}</div>}
                <div style={{ width: '100%', marginTop: 15 }}>
                  <button className="payoption" onClick={() => startPay('CARD')}>
                    <div className="payicon">▣</div>
                    <div><b>Tarjeta de crédito o débito</b><span>POS bancario</span></div>
                    <span style={{ marginLeft: 'auto' }}>›</span>
                  </button>
                  <button className="payoption" onClick={() => startPay('SINPE')}>
                    <div className="payicon">▣</div>
                    <div><b>SINPE Móvil</b><span>Pago desde tu celular</span></div>
                    <span style={{ marginLeft: 'auto' }}>›</span>
                  </button>
                  <button className="payoption" onClick={() => startPay('CASH')}>
                    <div className="payicon" style={{ background: '#dff7e8' }}>▣</div>
                    <div><b>Efectivo</b><span>solo si está habilitado</span></div>
                  </button>
                </div>
                <div className="sub" style={{ marginTop: 45 }}>Pago seguro y confiable</div>
              </div>
            </div>
          </section>

          <section className={screen === 'processing' ? 'screen active' : 'screen'}>
            <div className="top"><div className="brand"><span className="chef">♨</span> MiRestaurante</div></div>
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
            <div className="top"><div className="brand"><span className="chef">♨</span> MiRestaurante</div></div>
            <div className="body">
              <div className="center" style={{ height: 'auto', paddingTop: 12 }}>
                <h1 style={{ fontSize: 26 }}>Número de beeper</h1>
                <div className="sub">Ingresa los 3 números</div>
                <div className="beepercode">{beeper || '—'}</div>
                {beeperError && <div className="notice">{beeperError}</div>}
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
                      {key === 'borrar' ? '⌫' : key}
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
            <div className="top"><div className="brand"><span className="chef">♨</span> MiRestaurante</div></div>
            <div className="body">
              <div className="center">
                <div className="success">✓</div>
                <h1>¡Pago exitoso!</h1>
                <h2>Tu orden #{order?.number}<br />ha sido recibida</h2>
                <div className="infoitem"><div className="ico">♧</div><div><b>Beeper #{order?.beeperNumber}</b><br />Te avisaremos cuando esté listo</div></div>
                <div className="infoitem"><div className="ico">◷</div><div><b>Tiempo estimado</b><br />10 - 15 minutos</div></div>
                <button className="btn primary" style={{ marginTop: 15 }} onClick={() => setScreen('ready')}>Ver mi pedido</button>
                <button className="btn secondary" style={{ marginTop: 8 }} onClick={newOrder}>Nueva orden</button>
              </div>
            </div>
          </section>

          <section className={screen === 'ready' ? 'screen active' : 'screen'}>
            <div className="top"><div className="brand"><span className="chef">♨</span> MiRestaurante</div></div>
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
