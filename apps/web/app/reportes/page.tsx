'use client'

import { useEffect, useState } from 'react'
import { StaffPage } from '@/components/StaffPage'
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
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [report, setReport] = useState<Report | null>(null)

  async function load(start = from, end = to) {
    const res = await fetch(`/api/staff/reports?from=${start}&to=${end}`)
    if (res.ok) setReport(await res.json())
  }

  useEffect(() => { load(today, today) }, [])

  return (
    <StaffPage title="Reportes" section="reportes">
      <form className="sheet" onSubmit={(event) => { event.preventDefault(); load() }}>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
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
