import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from './prisma.service'

const ROLES = ['ADMIN', 'CASHIER', 'KITCHEN', 'SUPERVISOR']

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  private async branch() {
    const branch = await this.prisma.branch.findFirst()
    if (!branch) throw new NotFoundException('El menú no está disponible.')
    return branch
  }

  async login(pin: string) {
    const branch = await this.branch()
    const user = await this.prisma.staffUser.findFirst({ where: { branchId: branch.id, pin, active: true } })
    if (!user) throw new NotFoundException('Clave incorrecta')
    return { id: user.id, name: user.name, role: user.role }
  }

  async customerByCode(code: string) {
    const branch = await this.branch()
    const customer = await this.prisma.customer.findFirst({ where: { branchId: branch.id, code: code.trim() } })
    if (!customer) throw new NotFoundException('No encontramos esa tarjeta.')
    return { id: customer.id, code: customer.code, name: customer.name }
  }

  async customers() {
    const branch = await this.branch()
    return this.prisma.customer.findMany({ where: { branchId: branch.id }, orderBy: { name: 'asc' } })
  }

  async saveCustomer(body: { id?: string; code?: string; name?: string; phone?: string }) {
    const branch = await this.branch()
    const code = (body.code || '').trim()
    const name = (body.name || '').trim()
    if (!code || !name) throw new BadRequestException('Indica el código y el nombre.')
    const phone = (body.phone || '').trim()
    if (body.id) {
      return this.prisma.customer.update({ where: { id: body.id }, data: { code, name, phone } })
    }
    return this.prisma.customer.create({ data: { branchId: branch.id, code, name, phone } })
  }

  async promotions() {
    const branch = await this.branch()
    return this.prisma.promotion.findMany({ where: { branchId: branch.id }, orderBy: { createdAt: 'desc' } })
  }

  async savePromotion(body: { id?: string; name?: string; kind?: string; value?: number; productId?: string | null; active?: boolean }) {
    const branch = await this.branch()
    const name = (body.name || '').trim()
    const kind = body.kind === 'AMOUNT' ? 'AMOUNT' : 'PERCENT'
    const value = body.value ?? 0
    if (!name || !Number.isInteger(value) || value < 1 || (kind === 'PERCENT' && value > 100)) {
      throw new BadRequestException('Revisa el nombre y el valor de la promoción.')
    }
    const data = { name, kind, value, productId: body.productId || null, active: body.active !== false }
    if (body.id) return this.prisma.promotion.update({ where: { id: body.id }, data })
    return this.prisma.promotion.create({ data: { ...data, branchId: branch.id } })
  }

  async ingredients() {
    const branch = await this.branch()
    return this.prisma.ingredient.findMany({ where: { branchId: branch.id }, orderBy: { name: 'asc' } })
  }

  async saveIngredient(body: { id?: string; name?: string; unit?: string; stock?: number }) {
    const branch = await this.branch()
    const name = (body.name || '').trim()
    if (!name) throw new BadRequestException('Escribe el nombre.')
    const stock = body.stock
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) throw new BadRequestException('La existencia no es válida.')
    if (body.id) {
      return this.prisma.ingredient.update({
        where: { id: body.id },
        data: { name, unit: (body.unit || 'u').trim() || 'u', stock },
      })
    }
    return this.prisma.ingredient.create({
      data: { branchId: branch.id, name, unit: (body.unit || 'u').trim() || 'u', stock: stock ?? 0 },
    })
  }

  async recipe(productId: string) {
    return this.prisma.recipeLine.findMany({ where: { productId }, include: { ingredient: true } })
  }

  async saveRecipe(productId: string, lines: { ingredientId?: string; quantity?: number }[]) {
    const clean = lines
      .filter((line) => line.ingredientId && line.quantity && line.quantity > 0)
      .map((line) => ({ ingredientId: line.ingredientId as string, quantity: line.quantity as number }))
    await this.prisma.$transaction([
      this.prisma.recipeLine.deleteMany({ where: { productId } }),
      ...clean.map((line) =>
        this.prisma.recipeLine.create({ data: { productId, ingredientId: line.ingredientId, quantity: line.quantity } }),
      ),
    ])
    return this.recipe(productId)
  }

  async users() {
    const branch = await this.branch()
    return this.prisma.staffUser.findMany({
      where: { branchId: branch.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, pin: true, role: true, active: true },
    })
  }

  async saveUser(body: { id?: string; name?: string; pin?: string; role?: string; active?: boolean }) {
    const branch = await this.branch()
    const name = (body.name || '').trim()
    const pin = (body.pin || '').trim()
    const role = ROLES.includes(body.role || '') ? (body.role as string) : ''
    if (!name || !/^\d{4}$/.test(pin) || !role) throw new BadRequestException('Indica nombre, clave de 4 números y rol.')
    const data = { name, pin, role, active: body.active !== false }
    if (body.id) return this.prisma.staffUser.update({ where: { id: body.id }, data, select: { id: true, name: true, pin: true, role: true, active: true } })
    return this.prisma.staffUser.create({
      data: { ...data, branchId: branch.id },
      select: { id: true, name: true, pin: true, role: true, active: true },
    })
  }

  async shift() {
    const branch = await this.branch()
    return this.prisma.registerShift.findFirst({ where: { branchId: branch.id, closedAt: null }, orderBy: { openedAt: 'desc' } })
  }

  async openShift(openingCashCrc: number, openedBy: string) {
    const branch = await this.branch()
    if (!Number.isInteger(openingCashCrc) || openingCashCrc < 0) throw new BadRequestException('El efectivo inicial no es válido.')
    const open = await this.shift()
    if (open) throw new BadRequestException('La caja ya está abierta.')
    const terminal = await this.prisma.terminal.findFirst({ where: { branchId: branch.id, channel: 'POS' } })
    return this.prisma.registerShift.create({
      data: {
        branchId: branch.id,
        terminalName: terminal?.name || 'Caja 01',
        openedBy: openedBy || 'Caja',
        openingCashCrc,
      },
    })
  }

  async closeShift(closingCashCrc: number, closedBy: string, note: string) {
    const branch = await this.branch()
    const open = await this.shift()
    if (!open) throw new BadRequestException('No hay una caja abierta.')
    if (!Number.isInteger(closingCashCrc) || closingCashCrc < 0) throw new BadRequestException('El efectivo contado no es válido.')
    const sales = await this.prisma.order.findMany({
      where: {
        branchId: branch.id,
        paymentMethod: 'CASH',
        status: { not: 'CANCELLED' },
        createdAt: { gte: open.openedAt },
      },
    })
    const expectedCashCrc = open.openingCashCrc + sales.reduce((sum, order) => sum + order.totalCrc, 0)
    return this.prisma.registerShift.update({
      where: { id: open.id },
      data: { closingCashCrc, expectedCashCrc, closedBy: closedBy || 'Caja', note: note.trim(), closedAt: new Date() },
    })
  }

  async report(from: string, to: string) {
    const branch = await this.branch()
    const parse = (value: string) => {
      const [year, month, day] = value.split('-').map(Number)
      return new Date(year, (month || 1) - 1, day || 1)
    }
    const start = parse(from || new Date().toISOString().slice(0, 10))
    const end = parse(to || from || new Date().toISOString().slice(0, 10))
    end.setHours(23, 59, 59, 999)
    const orders = await this.prisma.order.findMany({
      where: { branchId: branch.id, createdAt: { gte: start, lte: end } },
      include: { items: true },
    })
    const live = orders.filter((order) => order.status !== 'CANCELLED')
    const byProduct = new Map<string, { name: string; quantity: number; totalCrc: number }>()
    for (const order of live) {
      for (const item of order.items) {
        const current = byProduct.get(item.name) || { name: item.name, quantity: 0, totalCrc: 0 }
        current.quantity += item.quantity
        current.totalCrc += item.unitPriceCrc * item.quantity
        byProduct.set(item.name, current)
      }
    }
    return {
      count: live.length,
      cancelled: orders.length - live.length,
      totalCrc: live.reduce((sum, order) => sum + order.totalCrc, 0),
      discountCrc: live.reduce((sum, order) => sum + order.discountCrc, 0),
      cashCrc: live.filter((order) => order.paymentMethod === 'CASH').reduce((sum, order) => sum + order.totalCrc, 0),
      cardCrc: live.filter((order) => order.paymentMethod === 'CARD').reduce((sum, order) => sum + order.totalCrc, 0),
      sinpeCrc: live.filter((order) => order.paymentMethod === 'SINPE').reduce((sum, order) => sum + order.totalCrc, 0),
      kiosk: live.filter((order) => order.channel === 'KIOSK').length,
      pos: live.filter((order) => order.channel === 'POS').length,
      products: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity),
    }
  }

  async audit() {
    const branch = await this.branch()
    return this.prisma.auditEvent.findMany({
      where: { branchId: branch.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  }

  async settings() {
    const branch = await this.branch()
    const terminals = await this.prisma.terminal.findMany({ where: { branchId: branch.id }, orderBy: { channel: 'asc' } })
    return { name: branch.name, idleSeconds: branch.idleSeconds, terminals }
  }

  async saveSettings(body: { name?: string; idleSeconds?: number; terminals?: { id: string; name: string }[] }) {
    const branch = await this.branch()
    const name = (body.name || branch.name).trim()
    const idleSeconds = body.idleSeconds ?? branch.idleSeconds
    if (!name || !Number.isInteger(idleSeconds) || idleSeconds < 15 || idleSeconds > 600) {
      throw new BadRequestException('Revisa el nombre y el tiempo de espera.')
    }
    await this.prisma.branch.update({ where: { id: branch.id }, data: { name, idleSeconds } })
    for (const terminal of body.terminals || []) {
      if (!terminal.name?.trim()) continue
      await this.prisma.terminal.updateMany({
        where: { id: terminal.id, branchId: branch.id },
        data: { name: terminal.name.trim() },
      })
    }
    return this.settings()
  }
}
