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
    const [categories, products] = await Promise.all([
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
    ])

    return {
      categories: categories.map((category) => ({ id: category.id, name: category.name })),
      products: products.map((product) => ({
        id: product.id,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        priceCrc: product.priceCrc,
        imageUrl: product.imageUrl,
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
    }))
  }

  async updateProduct(id: string, body: { name?: string; priceCrc?: number; active?: boolean }) {
    const branch = await this.branch()
    const current = await this.prisma.product.findFirst({ where: { id, branchId: branch.id } })
    if (!current) throw new NotFoundException('No encontramos ese producto.')

    const name = body.name?.trim()
    if (body.name !== undefined && !name) throw new BadRequestException('Escribe el nombre.')
    if (body.priceCrc !== undefined && (!Number.isInteger(body.priceCrc) || body.priceCrc < 0)) {
      throw new BadRequestException('El precio no es válido.')
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: name ?? undefined,
        priceCrc: body.priceCrc,
        active: body.active,
      },
    })
    return { id: product.id, name: product.name, priceCrc: product.priceCrc, active: product.active }
  }
}
