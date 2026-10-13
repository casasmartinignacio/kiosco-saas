'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'

type Settings = { name: string; idleSeconds: number; terminals: { id: string; name: string; channel: string }[] }

export default function LocalPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/staff/settings').then(async (res) => {
      if (res.ok) setSettings(await res.json())
    })
  }, [])

  if (!settings) return <StaffPage title="Local" section="local"><div className="sub">Cargando…</div></StaffPage>

  return (
    <StaffPage title="Local" section="local">
      <form className="sheet" onSubmit={async (event) => {
        event.preventDefault()
        const res = await fetch('/api/staff/settings', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(settings),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) setMessage(data?.message || 'No se pudo guardar.')
        else { setSettings(data); setMessage('Local actualizado.') }
      }}>
        <input value={settings.name} onChange={(event) => setSettings({ ...settings, name: event.target.value })} />
        <label className="sub">Segundos de espera en el kiosco
          <input value={settings.idleSeconds} inputMode="numeric" onChange={(event) => setSettings({ ...settings, idleSeconds: Number(event.target.value.replace(/\D/g, '') || 0) })} />
        </label>
        {settings.terminals.map((terminal) => (
          <label className="sub" key={terminal.id}>{terminal.channel === 'KIOSK' ? 'Kiosco' : 'Caja'}
            <input value={terminal.name} onChange={(event) => setSettings({ ...settings, terminals: settings.terminals.map((item) => item.id === terminal.id ? { ...item, name: event.target.value } : item) })} />
          </label>
        ))}
        <button className="btn primary" type="submit">Guardar</button>
        {message ? <div className="notice">{message}</div> : null}
      </form>
    </StaffPage>
  )
}
