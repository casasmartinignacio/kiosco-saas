'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'
import type { AdminProduct } from '@/lib/types'

export default function AdminPage() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [saved, setSaved] = useState('')

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
    setSaved('')
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: product.name,
        priceCrc: Number(product.priceCrc),
        active: product.active,
        stock: product.stock === null || Number.isNaN(product.stock) ? null : Number(product.stock),
        cabys: product.cabys || '',
      }),
    })
    if (res.ok) setSaved(product.id)
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
            <label>Nombre
              <input value={product.name} onChange={(event) => edit(product.id, { name: event.target.value })} />
            </label>
            <label>Precio en colones
              <input
                type="number"
                min={0}
                value={product.priceCrc}
                aria-label={`Precio de ${product.name}`}
                onChange={(event) => edit(product.id, { priceCrc: Number(event.target.value) })}
              />
            </label>
            <label>CABYS
              <input value={product.cabys || ''} placeholder="Para la factura" onChange={(event) => edit(product.id, { cabys: event.target.value })} />
            </label>
            <label>Existencia
              <input
                type="number"
                min={0}
                placeholder="Vacío: sin control"
                value={product.stock ?? ''}
                aria-label={`Existencia de ${product.name}`}
                onChange={(event) => edit(product.id, { stock: event.target.value === '' ? null : Number(event.target.value) })}
              />
            </label>
            <label className="checkline">
              <input type="checkbox" checked={product.active} onChange={(event) => edit(product.id, { active: event.target.checked })} />
              En el menú
            </label>
            <button className="save" onClick={() => save(product)}>{saved === product.id ? 'Guardado' : 'Guardar'}</button>
          </article>
        ))}
      </div>
    </StaffPage>
  )
}
