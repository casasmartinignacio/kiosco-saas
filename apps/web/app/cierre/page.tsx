'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import { money } from '@/lib/money'

type Shift = { openingCashCrc: number; openedBy: string; openedAt: string; terminalName: string } | null

export default function CierrePage() {
  const toast = useToast()
  const [shift, setShift] = useState<Shift>(undefined as unknown as Shift)
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

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
          if (counted === '' || !Number.isInteger(Number(counted))) {
            setError('Escribe el efectivo contado.')
            toast({ variant: 'error', message: 'Escribe el efectivo contado.' })
            return
          }
          const res = await fetch('/api/staff/shift/close', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ closingCashCrc: Number(counted), note: note.trim() }),
          })
          const data = await res.json().catch(() => null)
          if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo cerrar.' })
          else {
            const diff = data.closingCashCrc - data.expectedCashCrc
            toast({ variant: 'success', message: `Cerrada. Esperado ${money(data.expectedCashCrc)}. Diferencia ${money(diff)}.` })
            setShift(null)
          }
        }}>
          <div className="sub">{shift.terminalName} · abierta por {shift.openedBy} · inicial {money(shift.openingCashCrc)}</div>
          <Field label="Efectivo contado" kind="digits" value={counted} error={error} onValue={(next) => { setError(''); setCounted(next) }} />
          <Field label="Nota" kind="textarea" hint="Opcional" value={note} onValue={setNote} />
          <button className="btn primary" type="submit">Cerrar caja</button>
        </form>
      )}
    </StaffPage>
  )
}
