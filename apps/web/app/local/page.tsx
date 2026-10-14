'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'

type Printer = { name: string; host: string }
type Settings = {
  name: string
  idleSeconds: number
  legalId: string
  tradeName: string
  cabysDefault: string
  terminalUrl: string
  printers: Printer[]
  terminals: { id: string; name: string; channel: string }[]
}

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
      <form className="card form" onSubmit={async (event) => {
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
        <label>Nombre
          <input value={settings.name} onChange={(event) => setSettings({ ...settings, name: event.target.value })} />
        </label>
        <label>Segundos de espera en el kiosco
          <input value={settings.idleSeconds} inputMode="numeric" onChange={(event) => setSettings({ ...settings, idleSeconds: Number(event.target.value.replace(/\D/g, '') || 0) })} />
        </label>
        <label>Nombre comercial en la factura
          <input value={settings.tradeName} onChange={(event) => setSettings({ ...settings, tradeName: event.target.value })} />
        </label>
        <label>Cédula del emisor
          <input value={settings.legalId} onChange={(event) => setSettings({ ...settings, legalId: event.target.value })} />
        </label>
        <label>CABYS si el producto no tiene uno
          <input value={settings.cabysDefault} onChange={(event) => setSettings({ ...settings, cabysDefault: event.target.value })} />
        </label>
        <label>Dirección del datáfono
          <input value={settings.terminalUrl} placeholder="http://192.168.1.50:8080" onChange={(event) => setSettings({ ...settings, terminalUrl: event.target.value })} />
        </label>
        <div className="sub">El datáfono recibe un POST a /v1/charge con el monto en colones. La impresora de red escucha en el puerto 9100. En el kiosco se usa la primera. En caja se elige si hay más de una.</div>
        {settings.printers.map((printer, index) => (
          <div className="sheet" key={`${printer.host}-${index}`}>
            <input value={printer.name} placeholder="Nombre" onChange={(event) => setSettings({ ...settings, printers: settings.printers.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} />
            <input value={printer.host} placeholder="192.168.1.40:9100" onChange={(event) => setSettings({ ...settings, printers: settings.printers.map((item, itemIndex) => itemIndex === index ? { ...item, host: event.target.value } : item) })} />
          </div>
        ))}
        <button className="btn secondary" type="button" onClick={() => setSettings({ ...settings, printers: [...settings.printers, { name: '', host: '' }] })}>Agregar impresora</button>
        {settings.terminals.map((terminal) => (
          <label key={terminal.id}>{terminal.channel === 'KIOSK' ? 'Kiosco' : 'Caja'}
            <input value={terminal.name} onChange={(event) => setSettings({ ...settings, terminals: settings.terminals.map((item) => item.id === terminal.id ? { ...item, name: event.target.value } : item) })} />
          </label>
        ))}
        <button className="btn primary" type="submit">Guardar</button>
        {message ? <div className="notice">{message}</div> : null}
      </form>
    </StaffPage>
  )
}
