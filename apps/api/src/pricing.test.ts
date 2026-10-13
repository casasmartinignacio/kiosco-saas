import assert from 'node:assert/strict'
import { chargedUnit, orderDiscount, productPromo } from './pricing'

const ten = { name: '10%', kind: 'PERCENT' as const, value: 10, productId: 'p1' }
assert.equal(chargedUnit(5500, ten), 4950)
assert.equal(chargedUnit(800, { name: 'menos', kind: 'AMOUNT', value: 1000, productId: 'p1' }), 0)
assert.equal(orderDiscount(10000, { name: 'local', kind: 'AMOUNT', value: 1500, productId: null }), 1500)
assert.equal(productPromo([ten, { name: 'otro', kind: 'PERCENT', value: 5, productId: 'p2' }], 'p1')?.name, '10%')
console.log('pricing ok')
