'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { Modal } from '@/components/Modal'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import type { AdminProduct } from '@/lib/types'

type Promo = { id: string; name: string; kind: 'PERCENT' | 'AMOUNT'; value: number; productId: string | null; audience: 'EVERYONE' | 'CUSTOMERS'; active: boolean }

export default function PromosPage() {
  const toast = useToast()
  const [items, setItems] = useState<Promo[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'PERCENT' | 'AMOUNT'>('PERCENT')
  const [value, setValue] = useState('')
  const [productId, setProductId] = useState('')
  const [audience, setAudience] = useState<'EVERYONE' | 'CUSTOMERS'>('EVERYONE')
  const [errors, setErrors] = useState<{ name?: string; value?: string }>({})
  const [open, setOpen] = useState(false)

  async function load() {
    const [promos, menu] = await Promise.all([fetch('/api/staff/promotions'), fetch('/api/products')])
    if (promos.ok) setItems(await promos.json())
    if (menu.ok) setProducts(await menu.json())
  }

  useEffect(() => { load() }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const amount = Number(value)
    const next = {
      name: name.trim() ? '' : 'Escribe el nombre.',
      value: Number.isInteger(amount) && amount >= 1 && (kind === 'AMOUNT' || amount <= 100) ? '' : kind === 'PERCENT' ? 'El porcentaje va de 1 a 100.' : 'El monto debe ser al menos ₡1.',
    }
    setErrors(next)
    if (next.name || next.value) {
      toast({ variant: 'error', message: next.name || next.value })
      return
    }
    const res = await fetch('/api/staff/promotions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), kind, value: amount, productId: productId || null, audience, active: true }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar.' })
    else {
      setName('')
      setValue('')
      setAudience('EVERYONE')
      setProductId('')
      setErrors({})
      toast({ variant: 'success', message: 'Promoción guardada.' })
      setOpen(false)
      load()
    }
  }

  return (
    <StaffPage title="Promociones" section="promos">
      <div className="page-bar">
        <button className="btn primary" type="button" onClick={() => { setErrors({}); setOpen(true) }}>+ Nueva</button>
      </div>
      {open ? (
      <Modal title="Nueva promoción" onClose={() => setOpen(false)}>
      <form className="form" onSubmit={save}>
        <Field label="Nombre" value={name} error={errors.name} onValue={(next) => { setErrors((current) => ({ ...current, name: '' })); setName(next) }} />
        <Field label="Tipo" kind="select" value={kind} onValue={(next) => setKind(next as 'PERCENT' | 'AMOUNT')} options={[{ value: 'PERCENT', label: 'Porcentaje' }, { value: 'AMOUNT', label: 'Monto en colones' }]} />
        <Field label={kind === 'PERCENT' ? 'Porcentaje' : 'Monto'} kind="digits" hint={kind === 'PERCENT' ? 'De 1 a 100' : 'Colones, sin céntimos'} value={value} error={errors.value} onValue={(next) => { setErrors((current) => ({ ...current, value: '' })); setValue(next) }} />
        <Field label="Aplica a" kind="select" value={productId} onValue={setProductId} options={[{ value: '', label: 'Todo el pedido' }, ...products.map((product) => ({ value: product.id, label: product.name }))]} />
        <Field label="Para quién" kind="select" value={audience} onValue={(next) => setAudience(next === 'CUSTOMERS' ? 'CUSTOMERS' : 'EVERYONE')} options={[{ value: 'EVERYONE', label: 'Todos' }, { value: 'CUSTOMERS', label: 'Solo con tarjeta' }]} />
        <button className="btn primary" type="submit">Guardar</button>
      </form>
      </Modal>
      ) : null}
      {items.map((item) => (
        <div className="record" key={item.id}>
          <span>{item.name} · {item.kind === 'PERCENT' ? `${item.value}%` : `₡${item.value}`} · {item.productId ? products.find((product) => product.id === item.productId)?.name : 'Pedido'} · {item.audience === 'CUSTOMERS' ? 'Solo con tarjeta' : 'Todos'}</span>
          <button className={item.active ? 'danger' : 'ghost'} onClick={async () => {
            const res = await fetch('/api/staff/promotions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...item, active: !item.active }) })
            const data = await res.json().catch(() => null)
            if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo actualizar.' })
            else {
              toast({ variant: 'success', message: item.active ? 'Promoción pausada.' : 'Promoción activada.' })
              load()
            }
          }}>{item.active ? 'Pausar' : 'Activar'}</button>
        </div>
      ))}
    </StaffPage>
  )
}
