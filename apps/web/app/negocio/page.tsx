'use client'

import { useEffect, useState } from 'react'
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
  range: { id: string; label: string; text: string } | null
}

export default function NegocioPage() {
  const toast = useToast()
  const [range, setRange] = useState('today')
  const [report, setReport] = useState<Report | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/staff/reports?range=${range}`, { signal: controller.signal }).then(async (res) => {
      const data = await res.json().catch(() => null)
      if (!res.ok) toast({ variant: 'error', message: data?.message || 'No se pudo cargar la venta.' })
      else setReport(data)
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast({ variant: 'error', message: 'No se pudo cargar la venta.' })
    })
    return () => controller.abort()
  }, [range])

  const ticket = report && report.count > 0 ? Math.round(report.totalCrc / report.count) : 0

  return (
    <StaffPage title="Negocio" section="negocio">
      <div className="ranges">
        {RANGES.map((item) => (
          <button key={item.id} type="button" className={item.id === range ? 'on' : ''} onClick={() => setRange(item.id)}>{item.label}</button>
        ))}
      </div>
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
          <h2>Más vendidos</h2>
          {report.products.length ? report.products.slice(0, 5).map((product) => (
            <div className="sheet-row" key={product.name}><span>{product.quantity} × {product.name}</span><b>{money(product.totalCrc)}</b></div>
          )) : <p className="sub">No hay ventas en este período.</p>}
        </>
      ) : null}
    </StaffPage>
  )
}
