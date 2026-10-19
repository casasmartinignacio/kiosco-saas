export type Offer = {
  name: string
  kind: 'PERCENT' | 'AMOUNT'
  value: number
  productId: string | null
  audience?: 'EVERYONE' | 'CUSTOMERS'
}

export function visibleOffers(offers: Offer[], card: boolean) {
  return offers.filter((offer) => offer.audience !== 'CUSTOMERS' || card)
}

export function unitAfterOffer(base: number, offers: Offer[], productId: string) {
  let price = base
  let name = ''
  for (const offer of offers) {
    if (offer.productId !== productId) continue
    const next = offer.kind === 'PERCENT' ? Math.max(0, Math.round((base * (100 - offer.value)) / 100)) : Math.max(0, base - offer.value)
    if (next < price) {
      price = next
      name = offer.name
    }
  }
  return { price, name }
}

export function orderCut(subtotal: number, offers: Offer[]) {
  let best = { discount: 0, name: '' }
  for (const offer of offers) {
    if (offer.productId) continue
    const discount = offer.kind === 'PERCENT' ? Math.min(subtotal, Math.round((subtotal * offer.value) / 100)) : Math.min(subtotal, offer.value)
    if (discount > best.discount) best = { discount, name: offer.name }
  }
  return best
}
