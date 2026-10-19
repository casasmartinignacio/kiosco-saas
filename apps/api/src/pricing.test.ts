import assert from 'node:assert/strict'
import { chargedUnit, forCard, orderDiscount, orderPromo, productPromo } from './pricing'

const ten = { name: '10%', kind: 'PERCENT' as const, value: 10, productId: 'p1', audience: 'EVERYONE' as const }
const member = { name: 'socio', kind: 'PERCENT' as const, value: 20, productId: 'p1', audience: 'CUSTOMERS' as const }
assert.equal(chargedUnit(5500, ten), 4950)
assert.equal(chargedUnit(800, { name: 'menos', kind: 'AMOUNT', value: 1000, productId: 'p1' }), 0)
assert.equal(orderDiscount(10000, { name: 'local', kind: 'AMOUNT', value: 1500, productId: null }), 1500)
assert.equal(productPromo(forCard([ten, member], false), 'p1', 5500)?.name, '10%')
assert.equal(productPromo(forCard([ten, member], true), 'p1', 5500)?.name, 'socio')
const orderOffers = [{ name: 'todos', kind: 'AMOUNT' as const, value: 500, productId: null, audience: 'EVERYONE' as const }, { name: 'tarjeta', kind: 'PERCENT' as const, value: 10, productId: null, audience: 'CUSTOMERS' as const }]
assert.equal(orderPromo(forCard(orderOffers, false), 10000)?.name, 'todos')
assert.equal(orderPromo(forCard(orderOffers, true), 10000)?.name, 'tarjeta')
console.log('pricing ok')
