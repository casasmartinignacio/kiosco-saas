import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from './prisma.service'

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private async branch() {
    const branch = await this.prisma.branch.findFirst()
    if (!branch) throw new NotFoundException('El menú no está disponible.')
    return branch
  }

  async catalog() {
    const branch = await this.branch()
    const [categories, products, promotions, recipes] = await Promise.all([
      this.prisma.category.findMany({
        where: { tenantId: branch.tenantId },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { branchId: branch.id, active: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          groups: {
            orderBy: { sortOrder: 'asc' },
            include: { options: { orderBy: { sortOrder: 'asc' } } },
          },
        },
      }),
      this.prisma.promotion.findMany({ where: { branchId: branch.id, active: true } }),
      this.prisma.recipeLine.findMany({ where: { product: { branchId: branch.id } }, include: { ingredient: true } }),
    ])

    return {
      idleSeconds: branch.idleSeconds,
      promotions: promotions.map((promo) => ({
        name: promo.name,
        kind: promo.kind,
        value: promo.value,
        productId: promo.productId,
        audience: promo.audience === 'CUSTOMERS' ? 'CUSTOMERS' : 'EVERYONE',
      })),
      categories: categories.map((category) => ({ id: category.id, name: category.name })),
      products: products.map((product) => ({
        id: product.id,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        priceCrc: product.priceCrc,
        imageUrl: product.imageUrl,
        points: product.points,
        available: (() => {
          const recipe = recipes.filter((line) => line.productId === product.id)
          if (recipe.length) return recipe.every((line) => line.ingredient.stock >= line.quantity)
          return product.stock === null || product.stock > 0
        })(),
        groups: product.groups.map((group) => ({
          id: group.id,
          name: group.name,
          selection: group.selection,
          options: group.options.map((option) => ({
            id: option.id,
            name: option.name,
            priceCrc: option.priceCrc,
            selectedByDefault: option.selectedByDefault,
          })),
        })),
      })),
    }
  }

  async listProducts() {
    const branch = await this.branch()
    const products = await this.prisma.product.findMany({
      where: { branchId: branch.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        category: true,
        groups: { orderBy: { sortOrder: 'asc' }, include: { options: { orderBy: { sortOrder: 'asc' } } } },
      },
    })
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      priceCrc: product.priceCrc,
      imageUrl: product.imageUrl,
      active: product.active,
      category: product.category.name,
      stock: product.stock,
      cabys: product.cabys,
      points: product.points,
      groups: product.groups.map((group) => ({
        name: group.name,
        selection: group.selection === 'single' ? 'single' : 'multi',
        options: group.options.map((option) => ({
          name: option.name,
          priceCrc: option.priceCrc,
          selectedByDefault: option.selectedByDefault,
        })),
      })),
    }))
  }

  async updateProduct(id: string, body: { name?: string; priceCrc?: number; active?: boolean; stock?: number | null; cabys?: string; points?: number; groups?: GroupInput[] }) {
    const branch = await this.branch()
    const current = await this.prisma.product.findFirst({ where: { id, branchId: branch.id } })
    if (!current) throw new NotFoundException('No encontramos ese producto.')

    const name = body.name?.trim()
    if (body.name !== undefined && !name) throw new BadRequestException('Escribe el nombre.')
    if (body.priceCrc !== undefined && (!Number.isInteger(body.priceCrc) || body.priceCrc < 0)) {
      throw new BadRequestException('El precio no es válido.')
    }
    if (body.stock !== undefined && body.stock !== null && (!Number.isInteger(body.stock) || body.stock < 0)) {
      throw new BadRequestException('La existencia no es válida.')
    }
    if (body.points !== undefined && (!Number.isInteger(body.points) || body.points < 0)) {
      throw new BadRequestException('Los puntos no son válidos.')
    }

    const groups = body.groups === undefined ? undefined : cleanGroups(body.groups)

    const product = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.product.update({
        where: { id },
        data: {
          name: name ?? undefined,
          priceCrc: body.priceCrc,
          active: body.active,
          stock: body.stock,
          cabys: body.cabys?.trim(),
          points: body.points,
        },
      })
      if (groups !== undefined) {
        const currentGroups = await tx.modifierGroup.findMany({ where: { productId: id }, select: { id: true } })
        if (currentGroups.length) {
          await tx.modifierOption.deleteMany({ where: { groupId: { in: currentGroups.map((group) => group.id) } } })
          await tx.modifierGroup.deleteMany({ where: { productId: id } })
        }
        for (const [index, group] of groups.entries()) {
          await tx.modifierGroup.create({
            data: {
              productId: id,
              name: group.name,
              selection: group.selection,
              sortOrder: index + 1,
              options: {
                create: group.options.map((option, optionIndex) => ({
                  name: option.name,
                  priceCrc: option.priceCrc,
                  sortOrder: optionIndex + 1,
                  selectedByDefault: option.selectedByDefault,
                })),
              },
            },
          })
        }
      }
      return saved
    })
    return { id: product.id, name: product.name, priceCrc: product.priceCrc, active: product.active, groups: groups || [] }
  }
}

type GroupInput = { name?: string; selection?: string; options?: { name?: string; priceCrc?: number; selectedByDefault?: boolean }[] }

function cleanGroups(groups: GroupInput[]) {
  if (!Array.isArray(groups) || groups.length > 12) throw new BadRequestException('Hay demasiados grupos de variantes.')
  return groups.map((group) => {
    const name = (group.name || '').trim().slice(0, 60)
    if (!name) throw new BadRequestException('Escribe el nombre de cada grupo.')
    const selection = group.selection === 'single' ? 'single' : group.selection === 'multi' ? 'multi' : ''
    if (!selection) throw new BadRequestException('Elige si el grupo permite una o varias opciones.')
    const options = (group.options || []).map((option) => ({
      name: (option.name || '').trim().slice(0, 60),
      priceCrc: option.priceCrc ?? 0,
      selectedByDefault: Boolean(option.selectedByDefault),
    })).filter((option) => option.name)
    if (options.length === 0 || options.length > 30) throw new BadRequestException(`“${name}” necesita al menos una opción.`)
    if (options.some((option) => !Number.isInteger(option.priceCrc) || option.priceCrc < 0)) {
      throw new BadRequestException('El extra de una opción no es válido.')
    }
    return { name, selection, options }
  })
}
