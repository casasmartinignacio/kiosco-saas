'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { Modal } from '@/components/Modal'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'

type Customer = { id: string; code: string; name: string; phone: string }

export default function ClientesPage() {
  const toast = useToast()
  const [items, setItems] = useState<Customer[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ code?: string; name?: string; phone?: string }>({})
  const [open, setOpen] = useState(false)

  async function load() {
    const res = await fetch('/api/staff/customers')
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => { load() }, [])

  return (
    <StaffPage title="Clientes" section="clientes">
      <div className="page-bar">
        <button className="btn primary" type="button" onClick={() => { setErrors({}); setOpen(true) }}>+ Nuevo</button>
      </div>
      {open ? (
      <Modal title="Nuevo cliente" onClose={() => setOpen(false)}>
      <form className="form" onSubmit={async (event) => {
        event.preventDefault()
        const next = {
          code: code.trim() ? '' : 'Escribe el código de la tarjeta.',
          name: name.trim() ? '' : 'Escribe el nombre.',
          phone: !phone || /^\d{8}$/.test(phone) ? '' : 'El teléfono son 8 números.',
        }
        setErrors(next)
        if (next.code || next.name || next.phone) {
          toast({ variant: 'error', message: next.code || next.name || next.phone })
          return
        }
        const res = await fetch('/api/staff/customers', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: code.trim(), name: name.trim(), phone }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar.' })
        else {
          setCode('')
          setName('')
          setPhone('')
          setErrors({})
          toast({ variant: 'success', message: 'Cliente guardado.' })
          setOpen(false)
          load()
        }
      }}>
        <Field label="Código de tarjeta" kind="code" value={code} error={errors.code} onValue={(next) => { setErrors((current) => ({ ...current, code: '' })); setCode(next) }} />
        <Field label="Nombre" value={name} error={errors.name} onValue={(next) => { setErrors((current) => ({ ...current, name: '' })); setName(next) }} />
        <Field label="Teléfono" kind="digits" maxLength={8} hint="Opcional, 8 números" value={phone} error={errors.phone} onValue={(next) => { setErrors((current) => ({ ...current, phone: '' })); setPhone(next) }} />
        <button className="btn primary" type="submit">Guardar</button>
      </form>
      </Modal>
      ) : null}
      {items.map((item) => (
        <div className="record" key={item.id}><b>{item.code}</b><span>{item.name}</span><span>{item.phone}</span></div>
      ))}
    </StaffPage>
  )
}
