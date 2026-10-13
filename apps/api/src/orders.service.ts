import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { chargedUnit, orderDiscount, orderPromo, productPromo, type Promo } from './pricing'
import { ticketText } from './ticket'

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
}

type IncomingItem = { productId?: string; quantity?: number; optionIds?: string[]; note?: string }

type CreateBody = {
  paymentMethod?: string
  beeperNumber?: string
  note?: string
  idempotencyKey?: string
  receiptKind?: string
  customerName?: string
  customerTaxId?: string
  customerCode?: string
  items?: IncomingItem[]
}

const ORDER_INCLUDE = { items: true } as const

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async branch() {
    const branch = await this.prisma.branch.findFirst()
    if (!branch) throw new NotFoundException('El menú no está disponible.')
    return branch
  }

  async create(body: CreateBody, channel: 'KIOSK' | 'POS', actorName = '') {
    const paymentMethod = body.paymentMethod
    if (paymentMethod !== 'CARD' && paymentMethod !== 'SINPE' && paymentMethod !== 'CASH') {
      throw new BadRequestException('Elige un método de pago.')
    }
    const beeperNumber = (body.beeperNumber || '').trim()
    if (channel === 'KIOSK' && !/^\d{3}$/.test(beeperNumber)) {
      throw new BadRequestException('Ingresa los 3 números del beeper.')
    }
    if (beeperNumber && !/^\d{3}$/.test(beeperNumber)) {
      throw new BadRequestException('Ingresa los 3 números del beeper.')
    }
    if (!body.items?.length) throw new BadRequestException('El carrito está vacío.')

    const receiptKind = body.receiptKind === 'FACTURA' ? 'FACTURA' : 'TICKET'
    const customerName = (body.customerName || '').trim()
    const customerTaxId = (body.customerTaxId || '').trim()
    const customerCode = (body.customerCode || '').trim()
    if (receiptKind === 'FACTURA' && (!customerName || !customerTaxId)) {
      throw new BadRequestException('Para la factura indica el nombre y la cédula.')
    }

    const branch = await this.branch()
    if (channel === 'POS') {
      const open = await this.prisma.registerShift.findFirst({ where: { branchId: branch.id, closedAt: null } })
      if (!open) throw new BadRequestException('Abre la caja antes de cobrar.')
    }
    const promotions = (await this.prisma.promotion.findMany({ where: { branchId: branch.id, active: true } })).map(
      (promo): Promo => ({
        name: promo.name,
        kind: promo.kind === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
        value: promo.value,
        productId: promo.productId,
      }),
    )
    const idempotencyKey = (body.idempotencyKey || '').trim() || null
    if (idempotencyKey) {
      const existing = await this.prisma.order.findFirst({
        where: { branchId: branch.id, idempotencyKey },
        include: ORDER_INCLUDE,
      })
      if (existing) return this.present(existing)
    }

    if (beeperNumber) {
      const busy = await this.prisma.order.findFirst({
        where: {
          branchId: branch.id,
          beeperNumber,
          status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] },
        },
      })
      if (busy) throw new BadRequestException('Ese beeper ya está en un pedido.')
    }

    const productIds = body.items.map((item) => item.productId).filter((id): id is string => !!id)
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, branchId: branch.id, active: true },
      include: { groups: { include: { options: true } } },
    })
    const byId = new Map(products.map((product) => [product.id, product]))

    const lines = body.items.map((item) => {
      const product = item.productId ? byId.get(item.productId) : undefined
      const quantity = item.quantity
      if (!product || !quantity || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
        throw new BadRequestException('Revisa los productos del carrito.')
      }
      if (product.stock !== null && product.stock < quantity) {
        throw new BadRequestException(`${product.name} no tiene existencia suficiente.`)
      }
      let optionIds = item.optionIds || []
      if (optionIds.length === 0) {
        optionIds = product.groups.flatMap((group) => {
          if (group.selection === 'single') {
            const chosen = group.options.find((option) => option.selectedByDefault) || group.options[0]
            return chosen ? [chosen.id] : []
          }
          return group.options.filter((option) => option.selectedByDefault).map((option) => option.id)
        })
      }
      const chosen = []
      for (const group of product.groups) {
        const inGroup = group.options.filter((option) => optionIds.includes(option.id))
        if (group.selection === 'single' && inGroup.length !== 1) {
          throw new BadRequestException('Revisa los productos del carrito.')
        }
        chosen.push(...inGroup)
      }
      const unknown = optionIds.filter((id) => !product.groups.some((group) => group.options.some((option) => option.id === id)))
      if (unknown.length) throw new BadRequestException('Revisa los productos del carrito.')
      const note = (item.note || '').trim().slice(0, 140)
      const baseUnit = product.priceCrc + chosen.reduce((sum, option) => sum + option.priceCrc, 0)
      const unitPriceCrc = chargedUnit(baseUnit, productPromo(promotions, product.id))
      return {
        productId: product.id,
        name: product.name,
        quantity,
        unitPriceCrc,
        optionsLabel: chosen.map((option) => option.name).join(', '),
        note,
        stock: product.stock,
      }
    })

    const subtotalCrc = lines.reduce((sum, line) => sum + line.unitPriceCrc * line.quantity, 0)
    const appliedOrderPromo = orderPromo(promotions)
    const discountCrc = orderDiscount(subtotalCrc, appliedOrderPromo)
    const totalCrc = subtotalCrc - discountCrc
    const terminal = await this.prisma.terminal.findFirst({ where: { branchId: branch.id, channel } })
    const terminalName = terminal?.name || (channel === 'POS' ? 'Caja 01' : 'Kiosco 01')

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.branch.update({
          where: { id: branch.id },
          data: { nextOrderNumber: { increment: 1 } },
        })
        const recipes = await tx.recipeLine.findMany({ where: { productId: { in: lines.map((line) => line.productId) } } })
        for (const line of lines) {
          const recipe = recipes.filter((item) => item.productId === line.productId)
          if (recipe.length) {
            for (const part of recipe) {
              const used = await tx.ingredient.updateMany({
                where: { id: part.ingredientId, stock: { gte: part.quantity * line.quantity } },
                data: { stock: { decrement: part.quantity * line.quantity } },
              })
              if (used.count !== 1) throw new BadRequestException(`${line.name} no tiene existencia suficiente.`)
            }
            continue
          }
          if (line.stock === null) continue
          const sold = await tx.product.updateMany({
            where: { id: line.productId, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          })
          if (sold.count !== 1) throw new BadRequestException(`${line.name} no tiene existencia suficiente.`)
        }
        const created = await tx.order.create({
          data: {
            tenantId: branch.tenantId,
            branchId: branch.id,
            number: updated.nextOrderNumber - 1,
            paymentMethod,
            beeperNumber,
            channel,
            terminalName,
            note: (body.note || '').trim().slice(0, 140),
            idempotencyKey,
            receiptKind,
            customerName,
            customerTaxId,
            customerCode,
            invoiceStatus: 'NOT_ISSUED',
            discountCrc,
            promotionName: appliedOrderPromo && discountCrc > 0 ? appliedOrderPromo.name : '',
            subtotalCrc,
            totalCrc,
            items: {
              create: lines.map(({ stock: _stock, ...line }) => line),
            },
          },
          include: ORDER_INCLUDE,
        })
        await tx.auditEvent.create({
          data: {
            tenantId: branch.tenantId,
            branchId: branch.id,
            action: 'ORDER_CREATED',
            orderId: created.id,
            actorName,
            detail: `${terminalName} #${created.number}`,
          },
        })
        return created
      })
      return this.present(order)
    } catch (error) {
      if (idempotencyKey && error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        const existing = await this.prisma.order.findFirst({
          where: { branchId: branch.id, idempotencyKey },
          include: ORDER_INCLUDE,
        })
        if (existing) return this.present(existing)
      }
      throw error
    }
  }

  async board() {
    const branch = await this.branch()
    const orders = await this.prisma.order.findMany({
      where: { branchId: branch.id, status: { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] } },
      orderBy: { createdAt: 'asc' },
      include: { items: true },
    })
    return orders.map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      beeperNumber: order.beeperNumber,
      channel: order.channel,
      terminalName: order.terminalName,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        optionsLabel: item.optionsLabel,
        note: item.note,
      })),
    }))
  }

  async ready() {
    const branch = await this.branch()
    const orders = await this.prisma.order.findMany({
      where: { branchId: branch.id, status: 'READY' },
      orderBy: { number: 'asc' },
    })
    return orders.map((order) => ({ number: order.number }))
  }

  async summary() {
    const branch = await this.branch()
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const orders = await this.prisma.order.findMany({
      where: { branchId: branch.id, createdAt: { gte: start }, status: { not: 'CANCELLED' } },
    })
    const totalCrc = orders.reduce((sum, order) => sum + order.totalCrc, 0)
    return {
      count: orders.length,
      totalCrc,
      kiosk: orders.filter((order) => order.channel === 'KIOSK').length,
      pos: orders.filter((order) => order.channel === 'POS').length,
    }
  }

  async lookup(number: number) {
    const branch = await this.branch()
    const order = await this.prisma.order.findFirst({
      where: { branchId: branch.id, number },
      include: { items: true },
    })
    if (!order) throw new NotFoundException('No encontramos ese pedido.')
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      terminalName: order.terminalName,
      beeperNumber: order.beeperNumber,
      totalCrc: order.totalCrc,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        optionsLabel: item.optionsLabel,
        note: item.note,
      })),
    }
  }

  async advance(id: string, actorName = '') {
    const branch = await this.branch()
    const order = await this.prisma.order.findFirst({ where: { id, branchId: branch.id } })
    if (!order) throw new NotFoundException('No encontramos ese pedido.')
    const status = NEXT_STATUS[order.status]
    if (!status) throw new BadRequestException('Ese pedido ya cambió.')
    const updated = await this.prisma.order.update({ where: { id }, data: { status } })
    await this.audit(branch, 'ORDER_STATUS', id, status, actorName)
    return { id: updated.id, status: updated.status }
  }

  async deliver(id: string, actorName = '') {
    const branch = await this.branch()
    const order = await this.prisma.order.findFirst({ where: { id, branchId: branch.id } })
    if (!order) throw new NotFoundException('No encontramos ese pedido.')
    if (order.status !== 'READY') throw new BadRequestException('El pedido todavía no está listo.')
    const updated = await this.prisma.order.update({ where: { id }, data: { status: 'DELIVERED' } })
    await this.audit(branch, 'ORDER_DELIVERED', id, `#${order.number}`, actorName)
    return { id: updated.id, status: updated.status }
  }

  async cancel(id: string, reason: string, actorName = '') {
    const branch = await this.branch()
    const note = reason.trim()
    if (!note) throw new BadRequestException('Indica el motivo.')
    const order = await this.prisma.order.findFirst({ where: { id, branchId: branch.id } })
    if (!order) throw new NotFoundException('No encontramos ese pedido.')
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Ese pedido ya cambió.')
    }
    const updated = await this.prisma.order.update({ where: { id }, data: { status: 'CANCELLED' } })
    await this.audit(branch, 'ORDER_CANCELLED', id, note, actorName)
    return { id: updated.id, status: updated.status }
  }

  async reprint(id: string, actorName = '') {
    const branch = await this.branch()
    const order = await this.prisma.order.findFirst({ where: { id, branchId: branch.id }, include: ORDER_INCLUDE })
    if (!order) throw new NotFoundException('No encontramos ese pedido.')
    await this.audit(branch, 'TICKET_REPRINT', id, `#${order.number}`, actorName)
    return { ticket: ticketText(order) }
  }

  private audit(branch: { id: string; tenantId: string }, action: string, orderId: string, detail: string, actorName = '') {
    return this.prisma.auditEvent.create({
      data: { tenantId: branch.tenantId, branchId: branch.id, action, orderId, actorName, detail },
    })
  }

  private present(order: {
    id: string
    number: number
    beeperNumber: string
    totalCrc: number
    paymentMethod: string
    channel: string
    terminalName: string
    createdAt: Date
    receiptKind: string
    customerName: string
    customerTaxId: string
    customerCode: string
    discountCrc: number
    promotionName: string
    invoiceStatus: string
    items: { name: string; quantity: number; unitPriceCrc: number; optionsLabel: string; note: string }[]
  }) {
    return {
      id: order.id,
      number: order.number,
      beeperNumber: order.beeperNumber,
      totalCrc: order.totalCrc,
      paymentMethod: order.paymentMethod,
      channel: order.channel,
      terminalName: order.terminalName,
      ticket: ticketText(order),
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPriceCrc: item.unitPriceCrc,
        optionsLabel: item.optionsLabel,
        note: item.note,
      })),
    }
  }
}
