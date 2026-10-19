export type TicketLine = { name: string; quantity: number; unitPriceCrc: number; optionsLabel: string; note: string }

export type TicketOrder = {
  number: number
  createdAt: Date
  channel: string
  terminalName: string
  paymentMethod: string
  beeperNumber: string
  totalCrc: number
  discountCrc: number
  promotionName: string
  customerCode: string
  receiptKind: string
  customerName: string
  customerTaxId: string
  invoiceStatus: string
  invoiceClave: string
  invoiceNumber: string
  invoiceDetail: string
  items: TicketLine[]
}

const PAYMENT: Record<string, string> = {
  CARD: 'Tarjeta',
  SINPE: 'SINPE Móvil',
  CASH: 'Efectivo',
}

export function money(cents: number) {
  return '₡' + cents.toLocaleString('en-US')
}

export function ticketText(order: TicketOrder) {
  const when = order.createdAt.toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const lines = [
    'PUERTA CUATRO',
    'Café & Vinos',
    '',
    `PEDIDO #${order.number}`,
    when,
    order.terminalName,
    '',
  ]
  for (const item of order.items) {
    lines.push(`${item.quantity} x ${item.name}  ${money(item.unitPriceCrc * item.quantity)}`)
    for (const option of optionNames(item.optionsLabel)) lines.push(`   ${option}`)
    if (item.note) lines.push(`   ${item.note}`)
  }
  if (order.discountCrc > 0) lines.push(`Descuento ${order.promotionName} -${money(order.discountCrc)}`)
  lines.push('', `TOTAL ${money(order.totalCrc)}`, `Pago: ${PAYMENT[order.paymentMethod] || order.paymentMethod}`)
  if (order.customerCode) lines.push(`Cliente: ${order.customerName || order.customerCode}`)
  if (order.beeperNumber) lines.push(`Beeper: ${order.beeperNumber}`)
  lines.push(order.receiptKind === 'FACTURA' ? 'FACTURA ELECTRONICA' : 'TIQUETE ELECTRONICO')
  if (order.receiptKind === 'FACTURA') {
    lines.push(order.customerName)
    lines.push(`Cédula ${order.customerTaxId}`)
  }
  if (order.invoiceNumber) lines.push(`Consecutivo ${order.invoiceNumber}`)
  if (order.invoiceClave) lines.push(`Clave ${order.invoiceClave}`)
  if (order.invoiceStatus !== 'SUBMITTED' && order.invoiceStatus !== 'NOT_ISSUED') {
    lines.push(order.invoiceDetail || 'Pendiente de envío a Hacienda')
  }
  lines.push('', 'CONSERVE ESTE TICKET PARA RETIRAR SU PEDIDO')
  return lines.join('\n')
}

export function receiptHtml(order: TicketOrder) {
  const text = ticketText(order)
  const title = order.receiptKind === 'FACTURA' ? 'Factura electrónica' : 'Tiquete electrónico'
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${item.quantity} × ${escapeHtml(item.name)}${optionNames(item.optionsLabel).map((option) => `<div class="note">${escapeHtml(option)}</div>`).join('')}${item.note ? `<div class="note">${escapeHtml(item.note)}</div>` : ''}</td><td>${money(item.unitPriceCrc * item.quantity)}</td></tr>`,
    )
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page { size: 80mm auto; margin: 3mm; }
    body { width: 72mm; margin: 0 auto; color: #111; font: 12px/1.35 sans-serif; }
    img { width: 22mm; height: auto; display: block; margin: 0 auto 4px; }
    h1, p { margin: 0; text-align: center; }
    h1 { font-size: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { vertical-align: top; padding: 3px 0; }
    td:last-child { text-align: right; white-space: nowrap; }
    .note { color: #444; font-size: 11px; }
    .total { font-size: 16px; font-weight: 800; border-top: 1px dashed #111; }
    pre { white-space: pre-wrap; font: 11px/1.35 sans-serif; }
  </style></head><body>
    <img src="/assets/logo-mark.png" alt="">
    <h1>Puerta Cuatro</h1>
    <p>Café &amp; Vinos</p>
    <p>${title}</p>
    <table>${rows}<tr class="total"><td>Total</td><td>${money(order.totalCrc)}</td></tr></table>
    <pre>${escapeHtml(text)}</pre>
  </body></html>`
}

function optionNames(label: string) {
  if (!label.trim()) return []
  const parts = label.includes('\n') ? label.split('\n') : label.split(', ')
  return parts.map((name) => name.trim()).filter(Boolean)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
