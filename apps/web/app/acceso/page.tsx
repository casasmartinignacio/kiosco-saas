'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ACCESS, homeFor, type Role } from '@/lib/session'

function Gate() {
  const params = useSearchParams()
  const requested = params.get('next') || ''
  const next = ACCESS[requested] ? requested : ''
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  async function submit(value: string) {
    const res = await fetch('/api/acceso', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: value }),
    })
    const data = (await res.json().catch(() => null)) as { role?: Role } | null
    if (!res.ok || !data?.role) {
      setPin('')
      setError('Clave incorrecta')
      return
    }
    const allowed = next ? ACCESS[next] : null
    window.location.href = allowed?.includes(data.role) ? next : homeFor(data.role)
  }

  function press(key: string) {
    setError('')
    if (key === 'borrar') {
      setPin((value) => value.slice(0, -1))
      return
    }
    const nextPin = (pin + key).slice(0, 4)
    setPin(nextPin)
    if (nextPin.length === 4) submit(nextPin)
  }

  return (
    <div className="gate-wrap">
      <div className="gate">
        <div className="brand" style={{ justifyContent: 'center' }}><img className="mark" src="/assets/logo-mark.png" alt="" /> Puerta Cuatro</div>
        <h1 style={{ fontSize: 26 }}>Personal</h1>
        <div className="sub">Ingresa tu clave</div>
        <div className="dots">
          {[0, 1, 2, 3].map((index) => <i key={index} className={pin.length > index ? 'on' : ''} />)}
        </div>
        {error && <div className="notice">{error}</div>}
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'borrar', '0', ''].map((key) => (
            <button key={key || 'blank'} disabled={!key} onClick={() => press(key)}>
              {key === 'borrar' ? '⌫' : key}
            </button>
          ))}
        </div>
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
