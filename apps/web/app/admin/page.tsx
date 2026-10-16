'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Field } from '@/components/Field'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import { money } from '@/lib/money'
import type { AdminProduct } from '@/lib/types'

const PAGE_SIZE = 20

export default function AdminPage() {
  const toast = useToast()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  async function load() {
    const res = await fetch('/api/products')
    if (res.ok) setProducts(await res.json())
    setReady(true)
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

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return products
    return products.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(needle))
  }, [products, query])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)
  const from = filtered.length === 0 ? 0 : current * PAGE_SIZE + 1
  const to = Math.min(filtered.length, current * PAGE_SIZE + PAGE_SIZE)

  return (
    <StaffPage title="Productos" section="productos">
      <div className="product-bar">
        <Field label="Buscar" placeholder="Nombre o categoría" value={query} onValue={(next) => { setQuery(next); setPage(0) }} />
        <div className="pager">
          <button className="ghost" type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</button>
          <span>{from}–{to} de {filtered.length}</span>
          <button className="ghost" type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Siguiente</button>
        </div>
      </div>
      {ready && visible.length === 0 ? <p className="sub">{query.trim() ? 'Ningún producto coincide.' : 'No hay productos.'}</p> : null}
      <div className="cards">
        {visible.map((product) => {
          const open = openId === product.id
          return (
            <article className={`card product-card${open ? ' open' : ''}`} key={product.id}>
              <button className="product-toggle" type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : product.id)}>
                <img src={product.imageUrl} alt="" />
                <div className="copy">
                  <b>{product.name}</b>
                  <div className="sub meta">{product.category} · {money(product.priceCrc)}</div>
                  <div className="sub">{product.active ? 'En el menú' : 'Oculto'}</div>
                </div>
                <span className="chevron" aria-hidden="true">{open ? '–' : '+'}</span>
              </button>
              {open ? (
                <div className="product-edit">
                  <Field label="Nombre" value={product.name} onValue={(name) => edit(product.id, { name })} />
                  <Field label="Precio en colones" kind="digits" value={String(product.priceCrc)} onValue={(next) => edit(product.id, { priceCrc: Number(next || 0) })} />
                  <Field label="CABYS" kind="digits" maxLength={13} hint="13 números, o vacío" value={product.cabys || ''} onValue={(cabys) => edit(product.id, { cabys })} />
                  <Field label="Existencia" kind="digits" hint="Vacío: sin control" value={product.stock === null ? '' : String(product.stock)} onValue={(next) => edit(product.id, { stock: next === '' ? null : Number(next) })} />
                  <Check label="En el menú" checked={product.active} onChange={(active) => edit(product.id, { active })} />
                  <button className="save" onClick={() => save(product)}>Guardar</button>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </StaffPage>
  )
}
