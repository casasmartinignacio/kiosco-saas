'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import { CARD_TERMINAL_ENABLED } from '@/lib/devices'

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
  const toast = useToast()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [errors, setErrors] = useState<{ name?: string; idle?: string; cabys?: string; printer?: string }>({})

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
        const idle = settings.idleSeconds
        const cabys = settings.cabysDefault.trim()
        const incomplete = settings.printers.some((printer) => Boolean(printer.name.trim()) !== Boolean(printer.host.trim()))
        const next = {
          name: settings.name.trim() ? '' : 'Escribe el nombre.',
          idle: Number.isInteger(idle) && idle >= 15 && idle <= 600 ? '' : 'La espera va de 15 a 600 segundos.',
          cabys: !cabys || /^\d{13}$/.test(cabys) ? '' : 'El CABYS son 13 números.',
          printer: incomplete ? 'Cada impresora necesita nombre y dirección.' : '',
        }
        setErrors(next)
        if (next.name || next.idle || next.cabys || next.printer) {
          toast({ variant: 'error', message: next.name || next.idle || next.cabys || next.printer })
          return
        }
        const res = await fetch('/api/staff/settings', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(settings),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo guardar.' })
        else { setSettings(data); setErrors({}); toast({ variant: 'success', message: 'Local actualizado.' }) }
      }}>
        <Field label="Nombre" value={settings.name} error={errors.name} onValue={(name) => { setErrors((current) => ({ ...current, name: '' })); setSettings({ ...settings, name }) }} />
        <Field label="Segundos de espera en el kiosco" kind="digits" hint="Entre 15 y 600" value={String(settings.idleSeconds)} error={errors.idle} onValue={(next) => { setErrors((current) => ({ ...current, idle: '' })); setSettings({ ...settings, idleSeconds: Number(next || 0) }) }} />
        <Field label="Nombre comercial en la factura" value={settings.tradeName} onValue={(tradeName) => setSettings({ ...settings, tradeName })} />
        <Field label="Cédula del emisor" hint="Vacío en pruebas" value={settings.legalId} onValue={(legalId) => setSettings({ ...settings, legalId })} />
        <Field label="CABYS si el producto no tiene uno" kind="digits" maxLength={13} hint="13 números, o vacío" value={settings.cabysDefault} error={errors.cabys} onValue={(cabysDefault) => { setErrors((current) => ({ ...current, cabys: '' })); setSettings({ ...settings, cabysDefault }) }} />
        {CARD_TERMINAL_ENABLED ? (
          <Field label="Dirección del datáfono" placeholder="http://192.168.1.50:8080" value={settings.terminalUrl} onValue={(terminalUrl) => setSettings({ ...settings, terminalUrl })} />
        ) : null}
        <div className="sub">{CARD_TERMINAL_ENABLED ? 'El datáfono recibe un POST a /v1/charge con el monto en colones. ' : ''}La impresora de red escucha en el puerto 9100. En el kiosco se usa la primera. En caja se elige si hay más de una.</div>
        {errors.printer ? <span className="field-error">{errors.printer}</span> : null}
        {settings.printers.map((printer, index) => (
          <div className="sheet" key={`${printer.host}-${index}`}>
            <Field label="Impresora" value={printer.name} onValue={(name) => setSettings({ ...settings, printers: settings.printers.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item) })} />
            <Field label="Dirección" placeholder="192.168.1.40:9100" value={printer.host} onValue={(host) => setSettings({ ...settings, printers: settings.printers.map((item, itemIndex) => itemIndex === index ? { ...item, host } : item) })} />
          </div>
        ))}
        <button className="btn secondary" type="button" onClick={() => setSettings({ ...settings, printers: [...settings.printers, { name: '', host: '' }] })}>Agregar impresora</button>
        {settings.terminals.map((terminal) => (
          <Field key={terminal.id} label={terminal.channel === 'KIOSK' ? 'Kiosco' : 'Caja'} value={terminal.name} onValue={(name) => setSettings({ ...settings, terminals: settings.terminals.map((item) => item.id === terminal.id ? { ...item, name } : item) })} />
        ))}
        <button className="btn primary" type="submit">Guardar</button>
      </form>
    </StaffPage>
  )
}
