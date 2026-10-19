export type ModifierOption = {
  id: string
  name: string
  priceCrc: number
  selectedByDefault: boolean
}

export type ModifierGroup = {
  id: string
  name: string
  selection: 'single' | 'multi'
  options: ModifierOption[]
}

export type Product = {
  id: string
  categoryId: string
  name: string
  description: string
  priceCrc: number
  imageUrl: string
  available: boolean
  groups: ModifierGroup[]
}

export type Category = { id: string; name: string }

export type Promotion = { name: string; kind: 'PERCENT' | 'AMOUNT'; value: number; productId: string | null }

export type Catalog = { idleSeconds: number; categories: Category[]; products: Product[]; promotions: Promotion[] }

export type Line = {
  id: string
  productId: string
  name: string
  imageUrl: string
  quantity: number
  unitPriceCrc: number
  optionsLabel: string
  options: { name: string; priceCrc: number }[]
  optionIds: string[]
  note: string
}

export type BoardItem = { name: string; quantity: number; optionsLabel: string; note: string }

export type BoardOrder = {
  id: string
  number: number
  status: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY'
  beeperNumber: string
  channel: string
  terminalName: string
  createdAt: string
  items: BoardItem[]
}

export type PlacedOrder = {
  id: string
  number: number
  beeperNumber: string
  totalCrc: number
  ticket: string
  ticketHtml?: string
  items: { name: string; quantity: number; unitPriceCrc: number; optionsLabel: string; note: string }[]
}

export type VariantOption = { name: string; priceCrc: number; selectedByDefault?: boolean }

export type VariantGroup = { name: string; selection: 'single' | 'multi'; options: VariantOption[] }

export type AdminProduct = {
  id: string
  name: string
  priceCrc: number
  imageUrl: string
  active: boolean
  category: string
  stock: number | null
  cabys?: string
  groups: VariantGroup[]
}
