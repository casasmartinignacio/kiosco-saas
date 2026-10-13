'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'
import type { AdminProduct } from '@/lib/types'

type Promo = { id: string; name: string; kind: 'PERCENT' | 'AMOUNT'; value: number; productId: string | null; active: boolean }

export default function PromosPage() {
  const [items, setItems] = useState<Promo[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'PERCENT' | 'AMOUNT'>('PERCENT')
  const [value, setValue] = useState('')
  const [productId, setProductId] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const [promos, menu] = await Promise.all([fetch('/api/staff/promotions'), fetch('/api/products')])
    if (promos.ok) setItems(await promos.json())
    if (menu.ok) setProducts(await menu.json())
  }

  useEffect(() => { load() }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const res = await fetch('/api/staff/promotions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, kind, value: Number(value), productId: productId || null, active: true }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) setMessage(data?.message || 'No se pudo guardar.')
    else { setName(''); setValue(''); setMessage('Promoción guardada.'); load() }
  }

  return (
    <StaffPage title="Promociones" section="promos">
      <form className="card form" onSubmit={save}>
        <input value={name} placeholder="Nombre" onChange={(event) => setName(event.target.value)} />
        <select value={kind} onChange={(event) => setKind(event.target.value as 'PERCENT' | 'AMOUNT')}>
          <option value="PERCENT">Porcentaje</option>
          <option value="AMOUNT">Monto en colones</option>
        </select>
        <input value={value} inputMode="numeric" placeholder="Valor" onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))} />
        <select value={productId} onChange={(event) => setProductId(event.target.value)}>
          <option value="">Todo el pedido</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <button className="btn primary" type="submit">Guardar</button>
        {message ? <div className="notice">{message}</div> : null}
      </form>
      {items.map((item) => (
        <div className="record" key={item.id}>
          <span>{item.name} · {item.kind === 'PERCENT' ? `${item.value}%` : `₡${item.value}`} · {item.productId ? products.find((product) => product.id === item.productId)?.name : 'Pedido'}</span>
          <button className="linkish" onClick={async () => {
            await fetch('/api/staff/promotions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...item, active: !item.active }) })
            load()
          }}>{item.active ? 'Pausar' : 'Activar'}</button>
        </div>
      ))}
    </StaffPage>
  )
}
