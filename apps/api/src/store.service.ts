import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { costaRicaDays, periodText, salesWindow } from './costa-rica'
import { checkPassword, hashPassword } from './password'
import { PrismaService } from './prisma.service'

const ROLES = ['ADMIN', 'CASHIER', 'KITCHEN', 'SUPERVISOR', 'PICKUP']
const ACCOUNT_ROLES = ['ADMIN', 'SUPERVISOR']
const PIN_ROLES = ['CASHIER', 'KITCHEN', 'PICKUP']
const USER_SELECT = { id: true, name: true, pin: true, email: true, role: true, active: true } as const

function accountRole(role: string) {
  return ACCOUNT_ROLES.includes(role)
}

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  private async branch() {
    const branch = await this.prisma.branch.findFirst()
    if (!branch) throw new NotFoundException('El menú no está disponible.')
    return branch
  }

  async login(body: { pin?: string; email?: string; password?: string }) {
    const branch = await this.branch()
    const email = (body.email || '').trim().toLowerCase()
    if (email) {
      const user = await this.prisma.staffUser.findFirst({ where: { branchId: branch.id, email, active: true } })
      if (!user || !accountRole(user.role) || !checkPassword(body.password || '', user.passwordHash)) {
        throw new NotFoundException('Correo o contraseña incorrectos.')
      }
      return { id: user.id, name: user.name, role: user.role }
    }
    const pin = (body.pin || '').trim()
    const user = await this.prisma.staffUser.findFirst({ where: { branchId: branch.id, pin, role: { in: PIN_ROLES }, active: true } })
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
      select: USER_SELECT,
    })
  }

  async saveUser(body: { id?: string; name?: string; pin?: string; email?: string; password?: string; currentPassword?: string; role?: string; active?: boolean }, actorName = '') {
    const branch = await this.branch()
    const name = (body.name || '').trim()
    const role = ROLES.includes(body.role || '') ? (body.role as string) : ''
    if (!name || !role) throw new BadRequestException('Indica el nombre y el rol.')
    const active = body.active !== false
    const current = body.id ? await this.prisma.staffUser.findFirst({ where: { id: body.id, branchId: branch.id } }) : null
    if (body.id && !current) throw new NotFoundException('No encontramos a esa persona.')
    const data = accountRole(role)
      ? await this.accountData(body, current, name, role, active)
      : this.pinData(body, name, role, active)
    try {
      const saved = current
        ? await this.prisma.staffUser.update({ where: { id: current.id }, data, select: USER_SELECT })
        : await this.prisma.staffUser.create({ data: { ...data, branchId: branch.id }, select: USER_SELECT })
      const change = !current ? 'alta' : body.password ? 'contraseña' : current.pin !== saved.pin ? 'clave' : current.active !== saved.active ? (saved.active ? 'activado' : 'desactivado') : 'datos'
      await this.record(branch, 'STAFF_UPDATED', `${saved.name} · ${change}`, actorName)
      return saved
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = String(error.meta?.target || '')
        throw new BadRequestException(target.includes('email') ? 'Ese correo ya está en uso.' : 'Esa clave ya la usa otra persona.')
      }
      throw error
    }
  }

  private pinData(body: { pin?: string }, name: string, role: string, active: boolean) {
    const pin = (body.pin || '').trim()
    if (!/^\d{4}$/.test(pin)) throw new BadRequestException('Indica nombre, clave de 4 números y rol.')
    return { name, pin, email: null, passwordHash: '', role, active }
  }

  private async accountData(body: { id?: string; email?: string; password?: string; currentPassword?: string }, current: { passwordHash: string } | null, name: string, role: string, active: boolean) {
    const email = (body.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('El correo no es válido.')
    const password = body.password || ''
    let passwordHash = ''
    if (password) {
      if (password.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.')
      if (current && !checkPassword(body.currentPassword || '', current.passwordHash)) throw new BadRequestException('La contraseña actual no coincide.')
      passwordHash = hashPassword(password)
    } else if (current?.passwordHash) {
      passwordHash = current.passwordHash
    } else {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.')
    }
    return { name, pin: null, email, passwordHash, role, active }
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
    const shift = await this.prisma.registerShift.create({
      data: {
        branchId: branch.id,
        terminalName: terminal?.name || 'Caja 01',
        openedBy: openedBy || 'Caja',
        openingCashCrc,
      },
    })
    await this.record(branch, 'SHIFT_OPENED', `${shift.terminalName} · inicial ₡${openingCashCrc.toLocaleString('en-US')}`, openedBy)
    return shift
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
    const closed = await this.prisma.registerShift.update({
      where: { id: open.id },
      data: { closingCashCrc, expectedCashCrc, closedBy: closedBy || 'Caja', note: note.trim(), closedAt: new Date() },
    })
    const difference = closingCashCrc - expectedCashCrc
    await this.record(branch, 'SHIFT_CLOSED', `${open.terminalName} · contado ₡${closingCashCrc.toLocaleString('en-US')} · diferencia ₡${difference.toLocaleString('en-US')}`, closedBy)
    return closed
  }

  async report(from: string, to: string, range?: string) {
    const branch = await this.branch()
    const window = salesWindow(range)
    if (range && !window) throw new BadRequestException('El período no es válido.')
    const days = window ? null : costaRicaDays(from, to)
    if (!window && !days) throw new BadRequestException('El período no es válido.')
    const start = window?.start || days!.start
    const end = window?.end || new Date(days!.end.getTime() - 1)
    const createdAt = { gte: start, lte: end }
    const live = { branchId: branch.id, status: { not: 'CANCELLED' }, createdAt }
    const [totals, payments, channels, cancelled, products] = await Promise.all([
      this.prisma.order.aggregate({ where: live, _sum: { totalCrc: true, discountCrc: true }, _count: true }),
      this.prisma.order.groupBy({ by: ['paymentMethod'], where: live, _sum: { totalCrc: true } }),
      this.prisma.order.groupBy({ by: ['channel'], where: live, _count: true }),
      this.prisma.order.count({ where: { branchId: branch.id, status: 'CANCELLED', createdAt } }),
      this.prisma.$queryRaw<Array<{ name: string; quantity: bigint; totalCrc: bigint }>>(Prisma.sql`
        SELECT i.name AS name,
               COALESCE(SUM(i.quantity), 0) AS quantity,
               COALESCE(SUM(i."unitPriceCrc" * i.quantity), 0) AS "totalCrc"
        FROM "OrderItem" i
        INNER JOIN "Order" o ON o.id = i."orderId"
        WHERE o."branchId" = ${branch.id}
          AND o.status <> 'CANCELLED'
          AND o."createdAt" >= ${start}
          AND o."createdAt" <= ${end}
        GROUP BY i.name
        ORDER BY SUM(i.quantity) DESC, i.name ASC
      `),
    ])
    const paid = (method: string) => payments.find((row) => row.paymentMethod === method)?._sum.totalCrc || 0
    const channel = (name: string) => channels.find((row) => row.channel === name)?._count || 0
    return {
      count: totals._count,
      cancelled,
      totalCrc: totals._sum.totalCrc || 0,
      discountCrc: totals._sum.discountCrc || 0,
      cashCrc: paid('CASH'),
      cardCrc: paid('CARD'),
      sinpeCrc: paid('SINPE'),
      kiosk: channel('KIOSK'),
      pos: channel('POS'),
      products: products.map((product) => ({ name: product.name, quantity: Number(product.quantity), totalCrc: Number(product.totalCrc) })),
      range: {
        id: window?.id || 'custom',
        label: window?.label || 'Período',
        from: start.toISOString(),
        to: end.toISOString(),
        text: window?.text || periodText(start, end),
      },
    }
  }

  async audit() {
    const branch = await this.branch()
    const events = await this.prisma.auditEvent.findMany({
      where: { branchId: branch.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, action: true, actorName: true, detail: true, orderId: true, createdAt: true },
    })
    const orderIds = events.map((event) => event.orderId).filter((id): id is string => Boolean(id))
    const orders = orderIds.length
      ? await this.prisma.order.findMany({ where: { id: { in: orderIds }, branchId: branch.id }, select: { id: true, number: true } })
      : []
    const numbers = new Map(orders.map((order) => [order.id, order.number]))
    return events.map((event) => ({
      id: event.id,
      action: event.action,
      actorName: event.actorName,
      detail: event.detail,
      orderNumber: event.orderId ? numbers.get(event.orderId) ?? null : null,
      createdAt: event.createdAt,
    }))
  }

  async settings() {
    const branch = await this.branch()
    const terminals = await this.prisma.terminal.findMany({ where: { branchId: branch.id }, orderBy: { channel: 'asc' } })
    return {
      name: branch.name,
      idleSeconds: branch.idleSeconds,
      legalId: branch.legalId,
      tradeName: branch.tradeName,
      cabysDefault: branch.cabysDefault,
      terminalUrl: branch.terminalUrl,
      printers: this.printers(branch.printersJson),
      terminals,
    }
  }

  async saveSettings(body: {
    name?: string
    idleSeconds?: number
    legalId?: string
    tradeName?: string
    cabysDefault?: string
    terminalUrl?: string
    printers?: { name?: string; host?: string }[]
    terminals?: { id: string; name: string }[]
  }, actorName = '') {
    const branch = await this.branch()
    const name = (body.name || branch.name).trim()
    const idleSeconds = body.idleSeconds ?? branch.idleSeconds
    if (!name || !Number.isInteger(idleSeconds) || idleSeconds < 15 || idleSeconds > 600) {
      throw new BadRequestException('Revisa el nombre y el tiempo de espera.')
    }
    const printers = body.printers
      ? body.printers
          .map((printer) => ({ name: (printer.name || '').trim(), host: (printer.host || '').trim() }))
          .filter((printer) => printer.name && printer.host)
      : this.printers(branch.printersJson)
    await this.prisma.branch.update({
      where: { id: branch.id },
      data: {
        name,
        idleSeconds,
        legalId: (body.legalId ?? branch.legalId).trim(),
        tradeName: (body.tradeName ?? branch.tradeName).trim(),
        cabysDefault: (body.cabysDefault ?? branch.cabysDefault).trim(),
        terminalUrl: (body.terminalUrl ?? branch.terminalUrl).trim(),
        printersJson: JSON.stringify(printers),
      },
    })
    for (const terminal of body.terminals || []) {
      if (!terminal.name?.trim()) continue
      await this.prisma.terminal.updateMany({
        where: { id: terminal.id, branchId: branch.id },
        data: { name: terminal.name.trim() },
      })
    }
    await this.record(branch, 'SETTINGS_UPDATED', 'Datos del local', actorName)
    return this.settings()
  }

  private record(branch: { id: string; tenantId: string }, action: string, detail: string, actorName = '') {
    return this.prisma.auditEvent.create({
      data: { tenantId: branch.tenantId, branchId: branch.id, action, detail, actorName },
    })
  }

  async devices() {
    const branch = await this.branch()
    return { terminalUrl: branch.terminalUrl, printers: this.printers(branch.printersJson) }
  }

  private printers(value: string) {
    try {
      const parsed = JSON.parse(value) as { name?: string; host?: string }[]
      return parsed.filter((printer) => printer.name && printer.host).map((printer) => ({ name: printer.name as string, host: printer.host as string }))
    } catch {
      return []
    }
  }
}

