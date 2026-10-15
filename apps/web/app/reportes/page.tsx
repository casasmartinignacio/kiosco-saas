'use client'

import { useEffect, useState } from 'react'
import { Field } from '@/components/Field'
import { StaffPage } from '@/components/StaffPage'
import { useToast } from '@/components/Toast'
import { money } from '@/lib/money'

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
}

export default function ReportesPage() {
  const toast = useToast()
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [report, setReport] = useState<Report | null>(null)

  async function load(start = from, end = to) {
    if (start > end) {
      toast({ variant: 'error', message: 'La fecha inicial no puede ser posterior a la final.' })
      return
    }
    const res = await fetch(`/api/staff/reports?from=${start}&to=${end}`)
    const data = await res.json().catch(() => null)
    if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo cargar el reporte.' })
    else setReport(data)
  }

  useEffect(() => { load(today, today) }, [])

  return (
    <StaffPage title="Reportes" section="reportes">
      <form className="sheet" onSubmit={(event) => { event.preventDefault(); load() }}>
        <Field label="Desde" kind="date" value={from} onValue={setFrom} />
        <Field label="Hasta" kind="date" value={to} onValue={setTo} />
        <button className="btn primary" type="submit">Ver</button>
      </form>
      {report ? (
        <>
          <div className="sheet-row"><span>Pedidos</span><b>{report.count}</b></div>
          <div className="sheet-row"><span>Cancelados</span><b>{report.cancelled}</b></div>
          <div className="sheet-row"><span>Venta</span><b>{money(report.totalCrc)}</b></div>
          <div className="sheet-row"><span>Descuentos</span><b>{money(report.discountCrc)}</b></div>
          <div className="sheet-row"><span>Efectivo</span><b>{money(report.cashCrc)}</b></div>
          <div className="sheet-row"><span>Tarjeta</span><b>{money(report.cardCrc)}</b></div>
          <div className="sheet-row"><span>SINPE</span><b>{money(report.sinpeCrc)}</b></div>
          <div className="sheet-row"><span>Kiosco / Caja</span><b>{report.kiosk} / {report.pos}</b></div>
          {report.products.map((product) => (
            <div className="sheet-row" key={product.name}><span>{product.quantity} × {product.name}</span><b>{money(product.totalCrc)}</b></div>
          ))}
        </>
      ) : null}
    </StaffPage>
  )
}
