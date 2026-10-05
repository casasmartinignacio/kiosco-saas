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
  groups: ModifierGroup[]
}

export type Category = { id: string; name: string }

export type Catalog = { categories: Category[]; products: Product[] }

export type Line = {
  id: string
  productId: string
  name: string
  imageUrl: string
  quantity: number
  unitPriceCrc: number
  optionsLabel: string
  optionIds: string[]
}

export type BoardItem = { name: string; quantity: number; optionsLabel: string }

export type BoardOrder = {
  id: string
  number: number
  status: 'PENDING' | 'PREPARING' | 'READY'
  beeperNumber: string
  createdAt: string
  items: BoardItem[]
}

export type PlacedOrder = {
  id: string
  number: number
  beeperNumber: string
  totalCrc: number
  items: { name: string; quantity: number; unitPriceCrc: number; optionsLabel: string }[]
}

export type AdminProduct = {
  id: string
  name: string
  priceCrc: number
  imageUrl: string
  active: boolean
  category: string
}
