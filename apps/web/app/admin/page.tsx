'use client'

import { useEffect, useState } from 'react'
import { Check, Field } from '@/components/Field'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import type { AdminProduct } from '@/lib/types'

export default function AdminPage() {
  const toast = useToast()
  const [products, setProducts] = useState<AdminProduct[]>([])

  async function load() {
    const res = await fetch('/api/products')
    if (res.ok) setProducts(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  function edit(id: string, patch: Partial<AdminProduct>) {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, ...patch } : product)))
  }

  async function save(product: AdminProduct) {
    const price = Number(product.priceCrc)
    const cabys = (product.cabys || '').trim()
    if (!product.name.trim()) {
      toast({ variant: 'error', message: 'Escribe el nombre.' })
      return
    }
    if (!Number.isInteger(price) || price < 0) {
      toast({ variant: 'error', message: 'El precio no es válido.' })
      return
    }
    if (product.stock !== null && (!Number.isInteger(product.stock) || product.stock < 0)) {
      toast({ variant: 'error', message: 'La existencia no es válida.' })
      return
    }
    if (cabys && !/^\d{13}$/.test(cabys)) {
      toast({ variant: 'error', message: 'El CABYS son 13 números.' })
      return
    }
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: product.name.trim(),
        priceCrc: price,
        active: product.active,
        stock: product.stock,
        cabys,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar.' })
    else toast({ variant: 'success', message: `${product.name.trim()} guardado.` })
  }

  return (
    <StaffPage title="Productos" section="productos">
      <div className="cards">
        {products.map((product) => (
          <article className="card" key={product.id}>
            <div className="card-top">
              <img src={product.imageUrl} alt="" />
              <div>
                <b>{product.category}</b>
                <div className="sub">En la carta del kiosco y de la caja</div>
              </div>
            </div>
            <Field label="Nombre" value={product.name} onValue={(name) => edit(product.id, { name })} />
            <Field label="Precio en colones" kind="digits" value={String(product.priceCrc)} onValue={(next) => edit(product.id, { priceCrc: Number(next || 0) })} />
            <Field label="CABYS" kind="digits" maxLength={13} hint="13 números, o vacío" value={product.cabys || ''} onValue={(cabys) => edit(product.id, { cabys })} />
            <Field label="Existencia" kind="digits" hint="Vacío: sin control" value={product.stock === null ? '' : String(product.stock)} onValue={(next) => edit(product.id, { stock: next === '' ? null : Number(next) })} />
            <Check label="En el menú" checked={product.active} onChange={(active) => edit(product.id, { active })} />
            <button className="save" onClick={() => save(product)}>Guardar</button>
          </article>
        ))}
      </div>
    </StaffPage>
  )
}
