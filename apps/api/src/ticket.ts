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
    if (item.optionsLabel) lines.push(`   ${item.optionsLabel}`)
    if (item.note) lines.push(`   ${item.note}`)
  }
  if (order.discountCrc > 0) lines.push(`Descuento ${order.promotionName} -${money(order.discountCrc)}`)
  lines.push('', `TOTAL ${money(order.totalCrc)}`, `Pago: ${PAYMENT[order.paymentMethod] || order.paymentMethod}`)
  if (order.customerCode) lines.push(`Cliente: ${order.customerName || order.customerCode}`)
  if (order.beeperNumber) lines.push(`Beeper: ${order.beeperNumber}`)
  if (order.receiptKind === 'FACTURA') {
    lines.push(`Factura a nombre de ${order.customerName}`)
    lines.push(`Cédula ${order.customerTaxId}`)
    lines.push('Comprobante pendiente de emisión')
  } else {
    lines.push('Comprobante: tiquete')
  }
  lines.push('', 'CONSERVE ESTE TICKET PARA RETIRAR SU PEDIDO')
  return lines.join('\n')
}
