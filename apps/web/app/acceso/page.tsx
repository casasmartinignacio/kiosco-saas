'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Field } from '@/components/Field'
import { useToast } from '@/components/Toast'
import { ACCESS, STATIONS, homeFor, type Role } from '@/lib/session'

const ACCOUNT_PATHS = ['/negocio', '/admin', '/promos', '/inventario', '/reportes', '/bitacora', '/clientes', '/equipo', '/local']

function Gate() {
  const params = useSearchParams()
  const requested = params.get('next') || ''
  const next = ACCESS[requested] ? requested : ''
  const toast = useToast()
  const station = STATIONS.find((item) => item.home === next)
  const account = ACCOUNT_PATHS.includes(next)
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit(body: { pin?: string; email?: string; password?: string }) {
    const res = await fetch('/api/acceso', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => null)) as { role?: Role; message?: string } | null
    if (!res.ok || !data?.role) {
      setPin('')
      toast({ variant: 'error', message: data?.message || (account ? 'Correo o contraseña incorrectos.' : 'Clave incorrecta.') })
      return
    }
    const allowed = next ? ACCESS[next] : null
    window.location.href = allowed?.includes(data.role) ? next : homeFor(data.role)
  }

  function press(key: string) {
    if (key === 'borrar') {
      setPin((value) => value.slice(0, -1))
      return
    }
    const nextPin = (pin + key).slice(0, 4)
    setPin(nextPin)
    if (nextPin.length === 4) submit({ pin: nextPin })
  }

  return (
    <div className="gate-wrap">
      <div className={`gate${account ? ' account' : ''}`}>
        <div className="brand" style={{ justifyContent: 'center' }}><img className="mark" src="/assets/logo-mark.png" alt="" /> Puerta Cuatro</div>
        <h1 style={{ fontSize: 26 }}>{station ? station.label : 'Personal'}</h1>
        {account ? (
          <form className="form" onSubmit={(event) => {
            event.preventDefault()
            const clean = email.trim()
            if (!clean || !password) {
              toast({ variant: 'error', message: 'Escribe el correo y la contraseña.' })
              return
            }
            submit({ email: clean, password })
          }}>
            <div className="sub">Correo y contraseña</div>
            <Field label="Correo" value={email} autoComplete="username" onValue={setEmail} />
            <Field label="Contraseña" kind="password" value={password} autoComplete="current-password" onValue={setPassword} />
            <button className="btn primary" type="submit">Entrar</button>
          </form>
        ) : (
          <>
            <div className="sub">{station ? `Clave de ${station.label.toLowerCase()}` : 'Ingresa tu clave'}</div>
            <div className="dots">
              {[0, 1, 2, 3].map((index) => <i key={index} className={pin.length > index ? 'on' : ''} />)}
            </div>
            <div className="keypad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', ''].map((key) => (
                <button key={key || 'blank'} disabled={!key} onClick={() => press(key)}>
                  {key === 'borrar' ? '⌫' : key}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AccesoPage() {
  return (
    <Suspense>
      <Gate />
    </Suspense>
  )
}
