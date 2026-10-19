import assert from 'node:assert/strict'
import { orderSlipText, ticketText } from './ticket'

const text = ticketText({
  number: 1042,
  createdAt: new Date('2026-10-12T18:00:00.000Z'),
  channel: 'KIOSK',
  terminalName: 'Kiosco 01',
  paymentMethod: 'CARD',
  beeperNumber: '027',
  totalCrc: 11000,
  discountCrc: 0,
  promotionName: '',
  customerCode: '',
  receiptKind: 'TICKET',
  customerName: '',
  customerTaxId: '',
  invoiceStatus: 'NOT_ISSUED',
  invoiceClave: '',
  invoiceNumber: '',
  invoiceDetail: '',
  items: [{ name: 'Hamburguesa Clásica', quantity: 2, unitPriceCrc: 5500, optionsLabel: 'Sin queso\nEnsalada de papas', note: '' }],
})

assert.match(text, /PEDIDO Nº 1042/)
assert.match(text, /Kiosco 01/)
assert.match(text, /2 x Hamburguesa Clásica/)
assert.match(text, /Sin queso\n   Ensalada de papas/)
assert.match(text, /TOTAL ₡11,000/)
assert.match(text, /TIQUETE ELECTRONICO/)
assert.match(text, /COMPROBANTE DE PAGO/)
assert.match(text, /BEEPER 027/)
assert.doesNotMatch(text, /emitid/)

const slip = orderSlipText({
  number: 1042,
  createdAt: new Date('2026-10-12T18:00:00.000Z'),
  channel: 'KIOSK',
  terminalName: 'Kiosco 01',
  paymentMethod: 'COUNTER',
  beeperNumber: '027',
  totalCrc: 11000,
  discountCrc: 0,
  promotionName: '',
  customerCode: '',
  receiptKind: 'TICKET',
  customerName: '',
  customerTaxId: '',
  invoiceStatus: 'NOT_ISSUED',
  invoiceClave: '',
  invoiceNumber: '',
  invoiceDetail: '',
  items: [{ name: 'Hamburguesa Clásica', quantity: 2, unitPriceCrc: 5500, optionsLabel: 'Sin queso\nEnsalada de papas', note: '' }],
})
assert.match(slip, /Nº 1042/)
assert.match(slip, /BEEPER 027/)
assert.match(slip, /PAGA EN CAJA/)
assert.doesNotMatch(slip, /TIQUETE ELECTRONICO/)
assert.doesNotMatch(slip, /COMPROBANTE DE PAGO/)

console.log('ticket ok')
