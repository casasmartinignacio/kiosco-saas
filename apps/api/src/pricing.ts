export type Promo = { name: string; kind: 'PERCENT' | 'AMOUNT'; value: number; productId: string | null }

export function productPromo(promos: Promo[], productId: string) {
  const matches = promos.filter((promo) => promo.productId === productId)
  let best: Promo | null = null
  let bestUnitCut = 0
  for (const promo of matches) {
    const cut = promo.kind === 'PERCENT' ? promo.value : promo.value
    if (!best || cut > bestUnitCut) {
      best = promo
      bestUnitCut = cut
    }
  }
  return best
}

export function chargedUnit(baseUnit: number, promo: Promo | null) {
  if (!promo) return baseUnit
  if (promo.kind === 'PERCENT') return Math.max(0, Math.round((baseUnit * (100 - promo.value)) / 100))
  return Math.max(0, baseUnit - promo.value)
}

export function orderPromo(promos: Promo[]) {
  return promos.find((promo) => !promo.productId) || null
}

export function orderDiscount(subtotal: number, promo: Promo | null) {
  if (!promo || subtotal <= 0) return 0
  if (promo.kind === 'PERCENT') return Math.min(subtotal, Math.round((subtotal * promo.value) / 100))
  return Math.min(subtotal, promo.value)
}
