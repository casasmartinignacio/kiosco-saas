export type Promo = {
  name: string
  kind: 'PERCENT' | 'AMOUNT'
  value: number
  productId: string | null
  audience?: 'EVERYONE' | 'CUSTOMERS'
}

export function forCard(promos: Promo[], card: boolean) {
  return promos.filter((promo) => (promo.audience || 'EVERYONE') === 'EVERYONE' || card)
}

export function productPromo(promos: Promo[], productId: string, baseUnit: number) {
  const matches = promos.filter((promo) => promo.productId === productId)
  let best: Promo | null = null
  let bestPrice = baseUnit
  for (const promo of matches) {
    const price = chargedUnit(baseUnit, promo)
    if (price < bestPrice) {
      best = promo
      bestPrice = price
    }
  }
  return best
}

export function chargedUnit(baseUnit: number, promo: Promo | null) {
  if (!promo) return baseUnit
  if (promo.kind === 'PERCENT') return Math.max(0, Math.round((baseUnit * (100 - promo.value)) / 100))
  return Math.max(0, baseUnit - promo.value)
}

export function orderPromo(promos: Promo[], subtotal: number) {
  const matches = promos.filter((promo) => !promo.productId)
  let best: Promo | null = null
  let bestCut = 0
  for (const promo of matches) {
    const cut = orderDiscount(subtotal, promo)
    if (cut > bestCut) {
      best = promo
      bestCut = cut
    }
  }
  return best
}

export function orderDiscount(subtotal: number, promo: Promo | null) {
  if (!promo || subtotal <= 0) return 0
  if (promo.kind === 'PERCENT') return Math.min(subtotal, Math.round((subtotal * promo.value) / 100))
  return Math.min(subtotal, promo.value)
}
