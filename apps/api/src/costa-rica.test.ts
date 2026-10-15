import assert from 'node:assert/strict'
import { costaRicaDays, costaRicaInstant, salesWindow } from './costa-rica'

const afternoon = new Date('2026-10-15T22:00:00.000Z')
assert.equal(costaRicaInstant(2026, 10, 15).toISOString(), '2026-10-15T06:00:00.000Z')
assert.equal(costaRicaInstant(2026, 10, 16).toISOString(), '2026-10-16T06:00:00.000Z')

const today = salesWindow('today', afternoon)
assert.equal(today?.start.toISOString(), '2026-10-15T06:00:00.000Z')
assert.equal(today?.end.toISOString(), afternoon.toISOString())
assert.match(today?.text || '', /hora de Costa Rica/)

assert.equal(salesWindow('week', afternoon)?.start.toISOString(), '2026-10-09T06:00:00.000Z')
assert.equal(salesWindow('month', afternoon)?.start.toISOString(), '2026-09-16T06:00:00.000Z')
assert.equal(salesWindow('quarter', afternoon)?.start.toISOString(), '2026-07-18T06:00:00.000Z')
assert.equal(salesWindow('año', afternoon), null)

const beforeMidnight = new Date('2026-10-16T05:59:00.000Z')
assert.equal(salesWindow('today', beforeMidnight)?.start.toISOString(), '2026-10-15T06:00:00.000Z')

const day = costaRicaDays('2026-10-15', '2026-10-15', afternoon)
assert.equal(day?.start.toISOString(), '2026-10-15T06:00:00.000Z')
assert.equal(day?.end.toISOString(), '2026-10-16T06:00:00.000Z')
assert.equal(costaRicaDays('2026-02-31', '2026-02-31'), null)
assert.equal(costaRicaDays('2026-10-16', '2026-10-15'), null)

console.log('costa rica ok')
