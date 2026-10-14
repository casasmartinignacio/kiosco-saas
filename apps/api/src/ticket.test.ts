import assert from 'node:assert/strict'
import { ticketText } from './ticket'

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
  items: [{ name: 'Hamburguesa Clásica', quantity: 2, unitPriceCrc: 5500, optionsLabel: '', note: 'Sin cebolla' }],
})

assert.match(text, /PEDIDO #1042/)
assert.match(text, /Kiosco 01/)
assert.match(text, /2 x Hamburguesa Clásica/)
assert.match(text, /Sin cebolla/)
assert.match(text, /TOTAL ₡11,000/)
assert.match(text, /TIQUETE ELECTRONICO/)
assert.match(text, /CONSERVE ESTE TICKET PARA RETIRAR SU PEDIDO/)
assert.doesNotMatch(text, /emitid/)

console.log('ticket ok')
