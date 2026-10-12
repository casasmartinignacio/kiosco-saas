'use client'

import { useEffect, useState } from 'react'
import { StaffNav } from '@/components/StaffNav'
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
      body: JSON.stringify({ name: product.name, priceCrc: Number(product.priceCrc), active: product.active }),
    })
    if (res.ok) setSaved(product.id)
  }

  return (
    <div className="admin">
      <header className="staffbar">
        <div className="brand"><img className="mark" src="/assets/logo-mark.png" alt="" /> Puerta Cuatro</div>
        <StaffNav section="productos" />
      </header>
      <div className="sheet">
        <h1 style={{ fontSize: 28 }}>Productos</h1>
        {products.map((product) => (
          <div className="product-row" key={product.id}>
            <img src={product.imageUrl} alt="" />
            <div>
              <input value={product.name} onChange={(event) => edit(product.id, { name: event.target.value })} />
              <div className="sub" style={{ marginTop: 6 }}>{product.category}</div>
            </div>
            <div className="pricefield">
              <span>₡</span>
              <input
                type="number"
                min={0}
                value={product.priceCrc}
                aria-label={`Precio de ${product.name}`}
                onChange={(event) => edit(product.id, { priceCrc: Number(event.target.value) })}
              />
            </div>
            <label>
              <input type="checkbox" checked={product.active} onChange={(event) => edit(product.id, { active: event.target.checked })} />
              En el menú
            </label>
            <button className="save" onClick={() => save(product)}>{saved === product.id ? 'Guardado' : 'Guardar'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
