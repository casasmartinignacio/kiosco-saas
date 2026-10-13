'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'

type User = { id: string; name: string; pin: string; role: string; active: boolean }

const ROLES = [
  ['ADMIN', 'Administración'],
  ['CASHIER', 'Caja'],
  ['KITCHEN', 'Cocina'],
  ['SUPERVISOR', 'Supervisión'],
] as const

export default function EquipoPage() {
  const [items, setItems] = useState<User[]>([])
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState('CASHIER')
  const [message, setMessage] = useState('')

  async function load() {
    const res = await fetch('/api/staff/users')
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => { load() }, [])

  return (
    <StaffPage title="Equipo" section="equipo">
      <form className="card form" onSubmit={async (event) => {
        event.preventDefault()
        const res = await fetch('/api/staff/users', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, pin, role, active: true }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) setMessage(data?.message || 'No se pudo guardar.')
        else { setName(''); setPin(''); setMessage('Persona guardada.'); load() }
      }}>
        <input value={name} placeholder="Nombre" onChange={(event) => setName(event.target.value)} />
        <input value={pin} inputMode="numeric" maxLength={4} placeholder="Clave de 4 números" onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} />
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="btn primary" type="submit">Agregar</button>
        {message ? <div className="notice">{message}</div> : null}
      </form>
      {items.map((item) => (
        <div className="record" key={item.id}>
          <span>{item.name} · {ROLES.find((entry) => entry[0] === item.role)?.[1]} · {item.pin}</span>
          <button className="linkish" onClick={async () => {
            await fetch('/api/staff/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...item, active: !item.active }) })
            load()
          }}>{item.active ? 'Desactivar' : 'Activar'}</button>
        </div>
      ))}
    </StaffPage>
  )
}
