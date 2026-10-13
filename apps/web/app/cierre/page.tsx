'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'
import { money } from '@/lib/money'

type Shift = { openingCashCrc: number; openedBy: string; openedAt: string; terminalName: string } | null

export default function CierrePage() {
  const [shift, setShift] = useState<Shift>(undefined as unknown as Shift)
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const res = await fetch('/api/staff/shift')
    if (res.ok) setShift(await res.json())
  }

  useEffect(() => { load() }, [])

  return (
    <StaffPage title="Cierre de caja" section="cierre">
      {!shift ? <div className="sub">No hay una caja abierta.</div> : (
        <form className="sheet" onSubmit={async (event) => {
          event.preventDefault()
          const res = await fetch('/api/staff/shift/close', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ closingCashCrc: Number(counted), note }),
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) setMessage(data?.message || 'No se pudo cerrar.')
          else {
            const diff = data.closingCashCrc - data.expectedCashCrc
            setMessage(`Cerrada. Esperado ${money(data.expectedCashCrc)}. Diferencia ${money(diff)}.`)
            setShift(null)
          }
        }}>
          <div className="sub">{shift.terminalName} · abierta por {shift.openedBy} · inicial {money(shift.openingCashCrc)}</div>
          <input value={counted} inputMode="numeric" placeholder="Efectivo contado" onChange={(event) => setCounted(event.target.value.replace(/\D/g, ''))} />
          <textarea value={note} placeholder="Nota" onChange={(event) => setNote(event.target.value)} />
          <button className="btn primary" type="submit">Cerrar caja</button>
        </form>
      )}
      {message ? <div className="notice">{message}</div> : null}
    </StaffPage>
  )
}
