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
      })),
      categories: categories.map((category) => ({ id: category.id, name: category.name })),
      products: products.map((product) => ({
        id: product.id,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        priceCrc: product.priceCrc,
        imageUrl: product.imageUrl,
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
      include: { category: true },
    })
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      priceCrc: product.priceCrc,
      imageUrl: product.imageUrl,
      active: product.active,
      category: product.category.name,
      stock: product.stock,
    }))
  }

  async updateProduct(id: string, body: { name?: string; priceCrc?: number; active?: boolean; stock?: number | null }) {
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

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: name ?? undefined,
        priceCrc: body.priceCrc,
        active: body.active,
        stock: body.stock,
      },
    })
    return { id: product.id, name: product.name, priceCrc: product.priceCrc, active: product.active }
  }
}
