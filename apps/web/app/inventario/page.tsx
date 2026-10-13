'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'
import type { AdminProduct } from '@/lib/types'

type Ingredient = { id: string; name: string; unit: string; stock: number }
type Recipe = { ingredientId: string; quantity: number }

export default function InventarioPage() {
  const [items, setItems] = useState<Ingredient[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('u')
  const [stock, setStock] = useState('0')
  const [productId, setProductId] = useState('')
  const [lines, setLines] = useState<Recipe[]>([])
  const [message, setMessage] = useState('')

  async function load() {
    const [ingredients, menu] = await Promise.all([fetch('/api/staff/ingredients'), fetch('/api/products')])
    if (ingredients.ok) setItems(await ingredients.json())
    if (menu.ok) setProducts(await menu.json())
  }

  useEffect(() => { load() }, [])

  async function loadRecipe(id: string) {
    setProductId(id)
    if (!id) { setLines([]); return }
    const res = await fetch(`/api/staff/recipes/${id}`)
    if (res.ok) {
      const data = (await res.json()) as { ingredientId: string; quantity: number }[]
      setLines(data.map((line) => ({ ingredientId: line.ingredientId, quantity: line.quantity })))
    }
  }

  return (
    <StaffPage title="Inventario" section="inventario">
      <form className="card form" onSubmit={async (event) => {
        event.preventDefault()
        const res = await fetch('/api/staff/ingredients', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, unit, stock: Number(stock) }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) setMessage(data?.message || 'No se pudo guardar.')
        else { setName(''); setMessage('Ingrediente guardado.'); load() }
      }}>
        <input value={name} placeholder="Ingrediente" onChange={(event) => setName(event.target.value)} />
        <input value={unit} placeholder="Unidad" onChange={(event) => setUnit(event.target.value)} />
        <input value={stock} inputMode="numeric" placeholder="Existencia" onChange={(event) => setStock(event.target.value.replace(/\D/g, ''))} />
        <button className="btn primary" type="submit">Agregar ingrediente</button>
        {message ? <div className="notice">{message}</div> : null}
      </form>
      {items.map((item) => (
        <div className="record" key={item.id}>
          <span>{item.name} ({item.unit})</span>
          <input style={{ width: 90 }} value={item.stock} inputMode="numeric" onChange={(event) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, stock: Number(event.target.value.replace(/\D/g, '') || 0) } : row))} />
          <button className="linkish" onClick={async () => {
            await fetch('/api/staff/ingredients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item) })
            setMessage('Existencia actualizada.')
          }}>Guardar</button>
        </div>
      ))}
      <h2 style={{ marginTop: 28 }}>Receta</h2>
      <div className="card form">
        <select value={productId} onChange={(event) => loadRecipe(event.target.value)}>
          <option value="">Elige un producto</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        {productId ? lines.map((line, index) => (
          <div className="record" key={`${line.ingredientId}-${index}`}>
            <select value={line.ingredientId} onChange={(event) => setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ingredientId: event.target.value } : row))}>
              {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input style={{ width: 90 }} value={line.quantity} inputMode="numeric" onChange={(event) => setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value.replace(/\D/g, '') || 0) } : row))} />
          </div>
        )) : null}
        {productId ? (
          <>
            <button className="btn secondary" type="button" onClick={() => setLines((current) => [...current, { ingredientId: items[0]?.id || '', quantity: 1 }])}>Agregar a la receta</button>
            <button className="btn primary" type="button" onClick={async () => {
              const res = await fetch(`/api/staff/recipes/${productId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines }) })
              setMessage(res.ok ? 'Receta guardada. La venta descuenta estos ingredientes.' : 'No se pudo guardar la receta.')
            }}>Guardar receta</button>
          </>
        ) : null}
      </div>
    </StaffPage>
  )
}
