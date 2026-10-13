'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'

type Customer = { id: string; code: string; name: string; phone: string }

export default function ClientesPage() {
  const [items, setItems] = useState<Customer[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const res = await fetch('/api/staff/customers')
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => { load() }, [])

  return (
    <StaffPage title="Clientes" section="clientes">
      <form className="card form" onSubmit={async (event) => {
        event.preventDefault()
        const res = await fetch('/api/staff/customers', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code, name, phone }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) setMessage(data?.message || 'No se pudo guardar.')
        else { setCode(''); setName(''); setPhone(''); setMessage('Cliente guardado.'); load() }
      }}>
        <input value={code} placeholder="Código de tarjeta" onChange={(event) => setCode(event.target.value.toUpperCase())} />
        <input value={name} placeholder="Nombre" onChange={(event) => setName(event.target.value)} />
        <input value={phone} placeholder="Teléfono" onChange={(event) => setPhone(event.target.value)} />
        <button className="btn primary" type="submit">Guardar</button>
        {message ? <div className="notice">{message}</div> : null}
      </form>
      {items.map((item) => (
        <div className="record" key={item.id}><b>{item.code}</b><span>{item.name}</span><span>{item.phone}</span></div>
      ))}
    </StaffPage>
  )
}
