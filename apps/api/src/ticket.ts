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
  COUNTER: 'Pago en caja',
}

export function money(cents: number) {
  return '₡' + cents.toLocaleString('en-US')
}

function when(order: TicketOrder) {
  return order.createdAt.toLocaleString('es-CR', {
    timeZone: 'America/Costa_Rica',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function itemLines(order: TicketOrder) {
  const lines: string[] = []
  for (const item of order.items) {
    lines.push(`${item.quantity} x ${item.name}  ${money(item.unitPriceCrc * item.quantity)}`)
    for (const option of optionNames(item.optionsLabel)) lines.push(`   ${option}`)
    if (item.note) lines.push(`   ${item.note}`)
  }
  if (order.discountCrc > 0) lines.push(`Descuento ${order.promotionName} -${money(order.discountCrc)}`)
  return lines
}

export function orderSlipText(order: TicketOrder) {
  const lines = [
    'PUERTA CUATRO',
    'Café & Vinos',
    '',
    'PEDIDO',
    `Nº ${order.number}`,
    order.beeperNumber ? `BEEPER ${order.beeperNumber}` : '',
    when(order),
    order.terminalName,
    '',
    ...itemLines(order),
    '',
    `TOTAL ${money(order.totalCrc)}`,
    '',
    'PAGA EN CAJA',
    'No es un comprobante de pago.',
    'Conserva este papel para retirar tu pedido.',
  ]
  return lines.filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n')
}

export function ticketText(order: TicketOrder) {
  const lines = [
    'PUERTA CUATRO',
    'Café & Vinos',
    '',
    `PEDIDO Nº ${order.number}`,
    order.beeperNumber ? `BEEPER ${order.beeperNumber}` : '',
    when(order),
    order.terminalName,
    '',
    ...itemLines(order),
    '',
    `TOTAL ${money(order.totalCrc)}`,
    `Pago: ${PAYMENT[order.paymentMethod] || order.paymentMethod}`,
  ]
  if (order.customerCode) lines.push(`Cliente: ${order.customerName || order.customerCode}`)
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
  lines.push('', 'COMPROBANTE DE PAGO')
  return lines.join('\n')
}

function itemRows(order: TicketOrder) {
  return order.items
    .map(
      (item) =>
        `<tr><td>${item.quantity} × ${escapeHtml(item.name)}${optionNames(item.optionsLabel).map((option) => `<div class="note">${escapeHtml(option)}</div>`).join('')}${item.note ? `<div class="note">${escapeHtml(item.note)}</div>` : ''}</td><td>${money(item.unitPriceCrc * item.quantity)}</td></tr>`,
    )
    .join('')
}

function page(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: 80mm auto; margin: 3mm; }
    html, body { background: #fff; }
    body { width: 72mm; margin: 0 auto; color: #111; font: 13px/1.35 sans-serif; padding-bottom: 8px; }
    img { width: 28mm; height: auto; display: block; margin: 0 auto 6px; }
    h1, h2, p { margin: 0; text-align: center; }
    h1 { font-size: 18px; }
    h2 { font-size: 22px; margin-top: 8px; }
    .beeper { margin-top: 2px; font-size: 20px; font-weight: 800; text-align: center; }
    p.muted { color: #444; margin-top: 2px; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    td { vertical-align: top; padding: 3px 0; }
    td:last-child { text-align: right; white-space: nowrap; }
    .note { color: #444; font-size: 12px; }
    .total td { font-size: 16px; font-weight: 800; border-top: 1px dashed #111; padding-top: 6px; }
    .foot { margin-top: 10px; text-align: center; font-weight: 700; }
    .small { font-weight: 400; font-size: 12px; }
  </style></head><body>
    <img src="/assets/logo-mark.png" alt="">
    <h1>Puerta Cuatro</h1>
    <p>Café &amp; Vinos</p>
    ${body}
  </body></html>`
}

export function orderSlipHtml(order: TicketOrder) {
  return page(
    `Pedido ${order.number}`,
    `<h2>Pedido Nº ${order.number}</h2>
    ${order.beeperNumber ? `<p class="beeper">Beeper ${escapeHtml(order.beeperNumber)}</p>` : ''}
    <p class="muted">${escapeHtml(when(order))}</p>
    <p class="muted">${escapeHtml(order.terminalName)}</p>
    <table>${itemRows(order)}<tr class="total"><td>Total</td><td>${money(order.totalCrc)}</td></tr></table>
    <p class="foot">Paga en caja</p>
    <p class="foot small">No es un comprobante de pago.<br>Conserva este papel para retirar tu pedido.</p>`,
  )
}

export function receiptHtml(order: TicketOrder) {
  const title = order.receiptKind === 'FACTURA' ? 'Factura electrónica' : 'Tiquete electrónico'
  const who = order.receiptKind === 'FACTURA' ? `<p class="muted">${escapeHtml(order.customerName)} · Cédula ${escapeHtml(order.customerTaxId)}</p>` : ''
  const fiscal = [order.invoiceNumber ? `Consecutivo ${order.invoiceNumber}` : '', order.invoiceClave ? `Clave ${order.invoiceClave}` : '']
    .filter(Boolean)
    .map((line) => `<p class="muted">${escapeHtml(line)}</p>`)
    .join('')
  const pending = order.invoiceStatus !== 'SUBMITTED' && order.invoiceStatus !== 'NOT_ISSUED'
    ? `<p class="muted">${escapeHtml(order.invoiceDetail || 'Pendiente de envío a Hacienda')}</p>`
    : ''
  return page(
    title,
    `<p class="muted">${escapeHtml(title)}</p>
    <h2>Pedido Nº ${order.number}</h2>
    ${order.beeperNumber ? `<p class="beeper">Beeper ${escapeHtml(order.beeperNumber)}</p>` : ''}
    <p class="muted">${escapeHtml(when(order))}</p>
    <table>${itemRows(order)}<tr class="total"><td>Total</td><td>${money(order.totalCrc)}</td></tr></table>
    <p class="foot">Pago: ${escapeHtml(PAYMENT[order.paymentMethod] || order.paymentMethod)}</p>
    ${who}
    ${fiscal}
    ${pending}
    <p class="foot small">Comprobante de pago</p>`,
  )
}

function optionNames(label: string) {
  if (!label.trim()) return []
  const parts = label.includes('\n') ? label.split('\n') : label.split(', ')
  return parts.map((name) => name.trim()).filter(Boolean)
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
