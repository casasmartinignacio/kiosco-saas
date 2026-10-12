'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function Gate() {
  const params = useSearchParams()
  const next = params.get('next') === '/admin' ? '/admin' : '/cocina'
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  async function submit(value: string) {
    const res = await fetch('/api/acceso', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin: value }),
    })
    if (!res.ok) {
      setPin('')
      setError('Clave incorrecta')
      return
    }
    window.location.href = next
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
        <h1 style={{ fontSize: 26 }}>{next === '/admin' ? 'Productos' : 'Cocina'}</h1>
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
