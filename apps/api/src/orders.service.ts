import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from './prisma.service'

const NEXT_STATUS: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'DELIVERED',
}

type IncomingItem = { productId?: string; quantity?: number; optionIds?: string[] }

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(body: { paymentMethod?: string; beeperNumber?: string; items?: IncomingItem[] }) {
    const paymentMethod = body.paymentMethod
    if (paymentMethod !== 'CARD' && paymentMethod !== 'SINPE' && paymentMethod !== 'CASH') {
      throw new BadRequestException('Elige un método de pago.')
    }
    const beeperNumber = (body.beeperNumber || '').trim()
    if (!/^\d{3}$/.test(beeperNumber)) {
      throw new BadRequestException('Ingresa los 3 números del beeper.')
    }
    if (!body.items?.length) throw new BadRequestException('El carrito está vacío.')

    const branch = await this.prisma.branch.findFirst()
    if (!branch) throw new NotFoundException('El menú no está disponible.')

    const busy = await this.prisma.order.findFirst({
      where: {
        branchId: branch.id,
        beeperNumber,
        status: { in: ['PENDING', 'PREPARING', 'READY'] },
      },
    })
    if (busy) throw new BadRequestException('Ese beeper ya está en un pedido.')

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
      const optionIds = item.optionIds || []
      const chosen = []
      for (const group of product.groups) {
        const inGroup = group.options.filter((option) => optionIds.includes(option.id))
        if (group.selection === 'single' && inGroup.length !== 1) {
          throw new BadRequestException('Revisa los productos del carrito.')
        }
        if (group.selection === 'multi' && inGroup.length !== optionIds.filter((id) => group.options.some((option) => option.id === id)).length) {
          throw new BadRequestException('Revisa los productos del carrito.')
        }
        chosen.push(...inGroup)
      }
      const unknown = optionIds.filter((id) => !product.groups.some((group) => group.options.some((option) => option.id === id)))
      if (unknown.length) throw new BadRequestException('Revisa los productos del carrito.')

      const unitPriceCrc = product.priceCrc + chosen.reduce((sum, option) => sum + option.priceCrc, 0)
      return {
        productId: product.id,
        name: product.name,
        quantity,
        unitPriceCrc,
        optionsLabel: chosen.map((option) => option.name).join(', '),
      }
    })

    const totalCrc = lines.reduce((sum, line) => sum + line.unitPriceCrc * line.quantity, 0)

    const order = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id: branch.id },
        data: { nextOrderNumber: { increment: 1 } },
      })
      return tx.order.create({
        data: {
          tenantId: branch.tenantId,
          branchId: branch.id,
          number: updated.nextOrderNumber - 1,
          paymentMethod,
          beeperNumber,
          subtotalCrc: totalCrc,
          totalCrc,
          items: { create: lines },
        },
        include: { items: true },
      })
    })

    return {
      id: order.id,
      number: order.number,
      beeperNumber: order.beeperNumber,
      totalCrc: order.totalCrc,
      paymentMethod: order.paymentMethod,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPriceCrc: item.unitPriceCrc,
        optionsLabel: item.optionsLabel,
      })),
    }
  }

  async board() {
    const branch = await this.prisma.branch.findFirst()
    if (!branch) return []
    const orders = await this.prisma.order.findMany({
      where: { branchId: branch.id, status: { in: ['PENDING', 'PREPARING', 'READY'] } },
      orderBy: { createdAt: 'asc' },
      include: { items: true },
    })
    return orders.map((order) => ({
      id: order.id,
      number: order.number,
      status: order.status,
      beeperNumber: order.beeperNumber,
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        optionsLabel: item.optionsLabel,
      })),
    }))
  }

  async advance(id: string) {
    const branch = await this.prisma.branch.findFirst()
    if (!branch) throw new NotFoundException('No encontramos ese pedido.')
    const order = await this.prisma.order.findFirst({ where: { id, branchId: branch.id } })
    if (!order) throw new NotFoundException('No encontramos ese pedido.')
    const status = NEXT_STATUS[order.status]
    if (!status) throw new BadRequestException('Ese pedido ya cambió.')
    const updated = await this.prisma.order.update({ where: { id }, data: { status } })
    return { id: updated.id, status: updated.status }
  }
}
