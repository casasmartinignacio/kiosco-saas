'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import { money } from '@/lib/money'

const RANGES = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Últimos 7 días' },
  { id: 'month', label: 'Últimos 30 días' },
  { id: 'quarter', label: 'Últimos 90 días' },
]

type Report = {
  count: number
  cancelled: number
  totalCrc: number
  discountCrc: number
  cashCrc: number
  cardCrc: number
  sinpeCrc: number
  kiosk: number
  pos: number
  products: { name: string; quantity: number; totalCrc: number }[]
  range: { text: string; from: string; to: string } | null
}

function costaRicaDay(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

export default function ReportesPage() {
  const toast = useToast()
  const [preset, setPreset] = useState('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [report, setReport] = useState<Report | null>(null)

  async function load(query: string) {
    const res = await fetch(`/api/staff/reports?${query}`)
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      toast({ variant: 'error', message: data?.message || 'No se pudo cargar el reporte.' })
      return
    }
    setReport(data)
    if (data?.range?.from && data?.range?.to) {
      setFrom(costaRicaDay(data.range.from))
      setTo(costaRicaDay(data.range.to))
    }
  }

  useEffect(() => { load('range=today') }, [])

  const ticket = report && report.count > 0 ? Math.round(report.totalCrc / report.count) : 0

  return (
    <StaffPage title="Reportes" section="reportes">
      <div className="ranges">
        {RANGES.map((item) => (
          <button key={item.id} type="button" className={item.id === preset ? 'on' : ''} onClick={() => { setPreset(item.id); load(`range=${item.id}`) }}>{item.label}</button>
        ))}
      </div>
      <form className="sheet dates" onSubmit={(event) => {
        event.preventDefault()
        if (from > to) {
          toast({ variant: 'error', message: 'La fecha inicial no puede ser posterior a la final.' })
          return
        }
        setPreset('')
        load(`from=${from}&to=${to}`)
      }}>
        <Field label="Desde" kind="date" value={from} onValue={setFrom} />
        <Field label="Hasta" kind="date" value={to} onValue={setTo} />
        <button className="btn primary" type="submit">Ver</button>
      </form>
      {report?.range ? <p className="range-note">{report.range.text}</p> : null}
      {report ? (
        <>
          <div className="stats">
            <div className="stat lead">
              <span>Venta</span>
              <b>{money(report.totalCrc)}</b>
              <span>Sin pedidos cancelados. Descuentos incluidos: {money(report.discountCrc)}.</span>
            </div>
            <div className="stat"><span>Pedidos</span><b>{report.count}</b></div>
            <div className="stat"><span>Ticket promedio</span><b>{money(ticket)}</b></div>
            <div className="stat"><span>Cancelados</span><b>{report.cancelled}</b></div>
            <div className="stat"><span>Efectivo</span><b>{money(report.cashCrc)}</b></div>
            <div className="stat"><span>Tarjeta</span><b>{money(report.cardCrc)}</b></div>
            <div className="stat"><span>SINPE</span><b>{money(report.sinpeCrc)}</b></div>
            <div className="stat"><span>Pedidos del kiosco</span><b>{report.kiosk}</b></div>
            <div className="stat"><span>Pedidos de caja</span><b>{report.pos}</b></div>
          </div>
          <h2>Productos</h2>
          {report.products.length ? report.products.map((product) => (
            <div className="sheet-row" key={product.name}><span>{product.quantity} × {product.name}</span><b>{money(product.totalCrc)}</b></div>
          )) : <p className="sub">No hay ventas en este período.</p>}
        </>
      ) : null}
    </StaffPage>
  )
}
