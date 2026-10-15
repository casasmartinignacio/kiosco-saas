'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { Modal } from '@/components/Modal'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import { STATIONS } from '@/lib/session'

type User = { id: string; name: string; pin: string | null; email: string | null; password?: string; role: string; active: boolean }

const ROLES = STATIONS.filter((station) => station.role !== 'SUPERVISOR')

function accountRole(role: string) {
  return role === 'ADMIN' || role === 'SUPERVISOR'
}

function payload(item: User, extra: Partial<User> = {}) {
  const next = { ...item, ...extra }
  if (accountRole(next.role)) {
    return { id: next.id, name: next.name, role: next.role, active: next.active, email: next.email, password: next.password || undefined }
  }
  return { id: next.id, name: next.name, role: next.role, active: next.active, pin: next.pin }
}

export default function EquipoPage() {
  const toast = useToast()
  const [items, setItems] = useState<User[]>([])
  const [origin, setOrigin] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('CASHIER')
  const [errors, setErrors] = useState<{ name?: string; pin?: string; email?: string; password?: string }>({})
  const [pinError, setPinError] = useState('')

  async function load() {
    const res = await fetch('/api/staff/users')
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => {
    setOrigin(window.location.origin)
    load()
  }, [])

  async function copy(id: string, path: string) {
    const text = `${origin}${path}`
    const field = document.getElementById(`link-${id}`) as HTMLInputElement | null
    let ok = false
    try {
      await navigator.clipboard.writeText(text)
      ok = true
    } catch {
      field?.focus()
      field?.select()
      ok = document.execCommand('copy')
    }
    if (!ok) {
      toast({ variant: 'info', message: 'Selecciona el enlace y cópialo.' })
      return
    }
    toast({ variant: 'success', message: 'Enlace copiado.' })
  }

  return (
    <StaffPage title="Equipo" section="equipo">
      <div className="page-bar">
        <button className="btn primary" type="button" onClick={() => { setErrors({}); setOpen(true) }}>+ Nuevo</button>
      </div>
      {items.map((item) => {
        const station = STATIONS.find((entry) => entry.role === item.role)
        const link = station ? `${origin}${station.home}` : ''
        return (
          <div className="record person" key={item.id}>
            <div className="person-main">
              <div>
                <b>{item.name}</b>
                <div className="sub">{station?.label || item.role}{item.active ? '' : ' · Inactivo'}</div>
              </div>
              {link ? (
                <div className="copyline">
                  <Field id={`link-${item.id}`} grow readOnly ariaLabel={`Enlace de ${item.name}`} value={link} onValue={() => {}} onFocus={(event) => event.target.select()} />
                  <button className="ghost" type="button" onClick={() => copy(item.id, station?.home || '')}>Copiar</button>
                </div>
              ) : null}
            </div>
            <div className="person-actions">
              {accountRole(item.role) ? (
                <>
                  <Field
                    grow
                    ariaLabel={`Correo de ${item.name}`}
                    value={item.email || ''}
                    error={pinError === item.id ? 'El correo no es válido.' : ''}
                    onValue={(next) => {
                      setPinError('')
                      setItems((current) => current.map((row) => row.id === item.id ? { ...row, email: next } : row))
                    }}
                  />
                  <Field
                    grow
                    kind="password"
                    ariaLabel={`Nueva contraseña de ${item.name}`}
                    placeholder="Nueva contraseña"
                    value={item.password || ''}
                    onValue={(next) => setItems((current) => current.map((row) => row.id === item.id ? { ...row, password: next } : row))}
                  />
                  <button className="save" type="button" onClick={async () => {
                    const clean = (item.email || '').trim()
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
                      setPinError(item.id)
                      toast({ variant: 'error', message: 'El correo no es válido.' })
                      return
                    }
                    if (item.password && item.password.length < 8) {
                      toast({ variant: 'error', message: 'La contraseña debe tener al menos 8 caracteres.' })
                      return
                    }
                    const res = await fetch('/api/staff/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload(item, { email: clean })) })
                    const data = await res.json().catch(() => null)
                    if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar el acceso.' })
                    else { toast({ variant: 'success', message: `Acceso de ${item.name} actualizado.` }); load() }
                  }}>Guardar acceso</button>
                </>
              ) : (
                <>
                  <Field
                    compact
                    kind="digits"
                    maxLength={4}
                    ariaLabel={`Clave de ${item.name}`}
                    value={item.pin || ''}
                    error={pinError === item.id ? 'La clave son 4 números.' : ''}
                    onValue={(next) => {
                      setPinError('')
                      setItems((current) => current.map((row) => row.id === item.id ? { ...row, pin: next } : row))
                    }}
                  />
                  <button className="save" type="button" onClick={async () => {
                    if (!/^\d{4}$/.test(item.pin || '')) {
                      setPinError(item.id)
                      toast({ variant: 'error', message: 'La clave son 4 números.' })
                      return
                    }
                    const res = await fetch('/api/staff/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload(item)) })
                    const data = await res.json().catch(() => null)
                    if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar la clave.' })
                    else { toast({ variant: 'success', message: `Clave de ${item.name} actualizada.` }); load() }
                  }}>Guardar clave</button>
                </>
              )}
              <button className={item.active ? 'danger' : 'ghost'} type="button" onClick={async () => {
                const res = await fetch('/api/staff/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload(item, { active: !item.active, password: undefined })) })
                const data = await res.json().catch(() => null)
                if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo actualizar.' })
                else {
                  toast({ variant: 'success', message: item.active ? `${item.name} desactivado.` : `${item.name} activado.` })
                  load()
                }
              }}>{item.active ? 'Desactivar' : 'Activar'}</button>
            </div>
          </div>
        )
      })}
      {open ? (
        <Modal title="Nueva persona" onClose={() => setOpen(false)}>
          <form className="form" onSubmit={async (event) => {
            event.preventDefault()
            const account = accountRole(role)
            const next = {
              name: name.trim() ? '' : 'Escribe el nombre.',
              pin: account || /^\d{4}$/.test(pin) ? '' : 'La clave son 4 números.',
              email: !account || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? '' : 'El correo no es válido.',
              password: !account || password.length >= 8 ? '' : 'La contraseña debe tener al menos 8 caracteres.',
            }
            setErrors(next)
            if (next.name || next.pin || next.email || next.password) {
              toast({ variant: 'error', message: next.name || next.pin || next.email || next.password })
              return
            }
            const res = await fetch('/api/staff/users', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(account
                ? { name: name.trim(), email: email.trim(), password, role, active: true }
                : { name: name.trim(), pin, role, active: true }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar.' })
            else {
              setName('')
              setPin('')
              setEmail('')
              setPassword('')
              setErrors({})
              toast({ variant: 'success', message: 'Persona guardada.' })
              setOpen(false)
              load()
            }
          }}>
            <Field label="Nombre" value={name} error={errors.name} onValue={(value) => { setErrors((current) => ({ ...current, name: '' })); setName(value) }} />
            <Field label="Rol" kind="select" value={role} onValue={setRole} options={ROLES.map((station) => ({ value: station.role, label: station.label }))} />
            {accountRole(role) ? (
              <>
                <Field label="Correo" value={email} error={errors.email} autoComplete="off" onValue={(value) => { setErrors((current) => ({ ...current, email: '' })); setEmail(value) }} />
                <Field label="Contraseña" kind="password" hint="Al menos 8 caracteres" value={password} error={errors.password} autoComplete="new-password" onValue={(value) => { setErrors((current) => ({ ...current, password: '' })); setPassword(value) }} />
              </>
            ) : (
              <Field label="Clave" kind="digits" maxLength={4} hint="4 números" value={pin} error={errors.pin} onValue={(value) => { setErrors((current) => ({ ...current, pin: '' })); setPin(value) }} />
            )}
            <button className="btn primary" type="submit">Agregar</button>
          </form>
        </Modal>
      ) : null}
    </StaffPage>
  )
}
