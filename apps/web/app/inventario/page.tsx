'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { Modal } from '@/components/Modal'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import type { AdminProduct } from '@/lib/types'

type Ingredient = { id: string; name: string; unit: string; stock: number }
type Recipe = { ingredientId: string; quantity: number }

export default function InventarioPage() {
  const toast = useToast()
  const [items, setItems] = useState<Ingredient[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('u')
  const [stock, setStock] = useState('0')
  const [productId, setProductId] = useState('')
  const [lines, setLines] = useState<Recipe[]>([])
  const [errors, setErrors] = useState<{ name?: string; unit?: string; stock?: string }>({})
  const [open, setOpen] = useState(false)

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
      <div className="page-bar">
        <button className="btn primary" type="button" onClick={() => { setErrors({}); setOpen(true) }}>+ Nuevo ingrediente</button>
      </div>
      {open ? (
      <Modal title="Nuevo ingrediente" onClose={() => setOpen(false)}>
      <form className="form" onSubmit={async (event) => {
        event.preventDefault()
        const amount = Number(stock)
        const next = {
          name: name.trim() ? '' : 'Escribe el nombre.',
          unit: unit.trim() ? '' : 'Escribe la unidad.',
          stock: Number.isInteger(amount) && amount >= 0 && stock !== '' ? '' : 'La existencia no es válida.',
        }
        setErrors(next)
        if (next.name || next.unit || next.stock) {
          toast({ variant: 'error', message: next.name || next.unit || next.stock })
          return
        }
        const res = await fetch('/api/staff/ingredients', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), unit: unit.trim(), stock: amount }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar.' })
        else {
          setName('')
          setErrors({})
          toast({ variant: 'success', message: 'Ingrediente guardado.' })
          setOpen(false)
          load()
        }
      }}>
        <Field label="Ingrediente" value={name} error={errors.name} onValue={(next) => { setErrors((current) => ({ ...current, name: '' })); setName(next) }} />
        <Field label="Unidad" hint="Por ejemplo u, g o ml" value={unit} error={errors.unit} onValue={(next) => { setErrors((current) => ({ ...current, unit: '' })); setUnit(next) }} />
        <Field label="Existencia" kind="digits" value={stock} error={errors.stock} onValue={(next) => { setErrors((current) => ({ ...current, stock: '' })); setStock(next) }} />
        <button className="btn primary" type="submit">Agregar ingrediente</button>
      </form>
      </Modal>
      ) : null}
      {items.map((item) => (
        <div className="record" key={item.id}>
          <span>{item.name} ({item.unit})</span>
          <Field compact kind="digits" ariaLabel={`Existencia de ${item.name}`} value={String(item.stock)} onValue={(next) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, stock: Number(next || 0) } : row))} />
          <button className="save" onClick={async () => {
            const res = await fetch('/api/staff/ingredients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(item) })
            const data = await res.json().catch(() => null)
            if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar.' })
            else toast({ variant: 'success', message: 'Existencia actualizada.' })
          }}>Guardar</button>
        </div>
      ))}
      <h2 style={{ marginTop: 28 }}>Receta</h2>
      <div className="card form">
        <Field label="Producto" kind="select" value={productId} onValue={loadRecipe} options={[{ value: '', label: 'Elige un producto' }, ...products.map((product) => ({ value: product.id, label: product.name }))]} />
        {productId ? lines.map((line, index) => (
          <div className="record" key={`${line.ingredientId}-${index}`}>
            <Field grow kind="select" ariaLabel="Ingrediente" value={line.ingredientId} onValue={(next) => setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ingredientId: next } : row))} options={items.map((item) => ({ value: item.id, label: item.name }))} />
            <Field compact kind="digits" ariaLabel="Cantidad" value={String(line.quantity)} onValue={(next) => setLines((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(next || 0) } : row))} />
          </div>
        )) : null}
        {productId ? (
          <>
            <button className="btn secondary" type="button" onClick={() => setLines((current) => [...current, { ingredientId: items[0]?.id || '', quantity: 1 }])}>Agregar a la receta</button>
            <button className="btn primary" type="button" onClick={async () => {
              if (lines.some((line) => !line.ingredientId || !Number.isInteger(line.quantity) || line.quantity < 1)) {
                toast({ variant: 'error', message: 'Cada línea necesita un ingrediente y una cantidad.' })
                return
              }
              const res = await fetch(`/api/staff/recipes/${productId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lines }) })
              const data = await res.json().catch(() => null)
              toast(res.ok
                ? { variant: 'success', message: 'Receta guardada. La venta descuenta estos ingredientes.' }
                : { variant: 'error', message: data?.message || 'No se pudo guardar la receta.' })
            }}>Guardar receta</button>
          </>
        ) : null}
      </div>
    </StaffPage>
  )
}
