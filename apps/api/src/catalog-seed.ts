import { PrismaClient } from '@prisma/client'
import { hashPassword } from './password'

const ADMIN_EMAIL = 'admin@puertacuatro.com'
const ADMIN_PASSWORD = 'Abc123456'

export async function seedCatalog(prisma: PrismaClient) {
  const tenant = await prisma.tenant.create({ data: { name: 'Puerta Cuatro' } })
  const branch = await prisma.branch.create({
    data: { tenantId: tenant.id, name: 'Sucursal principal', nextOrderNumber: 1042 },
  })

  const categories = await Promise.all(
    [
      ['Hamburguesas', 1],
      ['Pizzas', 2],
      ['Bebidas', 3],
      ['Postres', 4],
      ['Acompañamientos', 5],
    ].map(([name, sortOrder]) =>
      prisma.category.create({
        data: { tenantId: tenant.id, name: String(name), sortOrder: Number(sortOrder) },
      }),
    ),
  )
  const byName = Object.fromEntries(categories.map((category) => [category.name, category.id]))

  const products = [
    {
      name: 'Hamburguesa Clásica',
      description: 'Carne de res, queso cheddar, lechuga y tomate.',
      priceCrc: 5500,
      imageUrl: '/assets/burger2.jpg',
      category: 'Hamburguesas',
      sortOrder: 1,
    },
    {
      name: 'Hamburguesa BBQ',
      description: 'Carne 100% res, tocino, queso cheddar, cebolla caramelizada y salsa BBQ.',
      priceCrc: 6200,
      imageUrl: '/assets/burger2.jpg',
      category: 'Hamburguesas',
      sortOrder: 2,
    },
    {
      name: 'Papas Fritas',
      description: 'Porción de papas fritas.',
      priceCrc: 2000,
      imageUrl: '/assets/fries.jpg',
      category: 'Acompañamientos',
      sortOrder: 3,
    },
    {
      name: 'Chicken Tenders',
      description: 'Tiras de pollo apanado.',
      priceCrc: 4800,
      imageUrl: '/assets/tenders.jpg',
      category: 'Acompañamientos',
      sortOrder: 4,
    },
    {
      name: 'Pizza Margarita',
      description: 'Salsa de tomate, mozzarella y albahaca.',
      priceCrc: 5900,
      imageUrl: '/assets/pizza.jpg',
      category: 'Pizzas',
      sortOrder: 5,
    },
    {
      name: 'Ensalada César',
      description: 'Lechuga romana, crutones y aderezo césar.',
      priceCrc: 4500,
      imageUrl: '/assets/salad.jpg',
      category: 'Acompañamientos',
      sortOrder: 6,
    },
  ]

  for (const product of products) {
    await prisma.product.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        categoryId: byName[product.category],
        name: product.name,
        description: product.description,
        priceCrc: product.priceCrc,
        imageUrl: product.imageUrl,
        sortOrder: product.sortOrder,
      },
    })
  }

  const bbq = await prisma.product.findFirstOrThrow({ where: { name: 'Hamburguesa BBQ' } })
  const pan = await prisma.modifierGroup.create({
    data: { productId: bbq.id, name: 'Tipo de pan', selection: 'single', sortOrder: 1 },
  })
  await prisma.modifierOption.createMany({
    data: [
      { groupId: pan.id, name: 'Tradicional', priceCrc: 0, sortOrder: 1, selectedByDefault: true },
      { groupId: pan.id, name: 'Integral', priceCrc: 0, sortOrder: 2 },
    ],
  })
  const extras = await prisma.modifierGroup.create({
    data: { productId: bbq.id, name: 'Extras', selection: 'multi', sortOrder: 2 },
  })
  await prisma.modifierOption.createMany({
    data: [
      { groupId: extras.id, name: 'Tocino', priceCrc: 800, sortOrder: 1, selectedByDefault: true },
      { groupId: extras.id, name: 'Queso extra', priceCrc: 600, sortOrder: 2 },
      { groupId: extras.id, name: 'Aguacate', priceCrc: 700, sortOrder: 3 },
      { groupId: extras.id, name: 'Cebolla caramelizada', priceCrc: 500, sortOrder: 4 },
    ],
  })
}

export async function seedIfEmpty(prisma: PrismaClient) {
  await prisma.tenant.updateMany({ where: { name: 'MiRestaurante' }, data: { name: 'Puerta Cuatro' } })
  const existing = await prisma.tenant.count()
  if (existing === 0) await seedCatalog(prisma)
  const branch = await prisma.branch.findFirst()
  if (!branch) return
  const terminals = await prisma.terminal.count({ where: { branchId: branch.id } })
  if (terminals === 0) {
    await prisma.terminal.createMany({
      data: [
        { tenantId: branch.tenantId, branchId: branch.id, name: 'Kiosco 01', channel: 'KIOSK' },
        { tenantId: branch.tenantId, branchId: branch.id, name: 'Caja 01', channel: 'POS' },
      ],
    })
  }
  const staff = await prisma.staffUser.count({ where: { branchId: branch.id } })
  if (staff === 0) {
    await prisma.staffUser.create({
      data: {
        branchId: branch.id,
        name: 'Encargado',
        email: ADMIN_EMAIL,
        passwordHash: hashPassword(ADMIN_PASSWORD),
        role: 'ADMIN',
      },
    })
  }
  await prisma.staffUser.updateMany({ where: { email: 'encargado@puertacuatro.com' }, data: { email: ADMIN_EMAIL } })
  const pending = await prisma.staffUser.findMany({
    where: { branchId: branch.id, role: { in: ['ADMIN', 'SUPERVISOR'] }, email: null },
    orderBy: { createdAt: 'asc' },
  })
  const encargado = pending.find((user) => user.name === 'Encargado') || pending[0]
  if (encargado) {
    await prisma.staffUser.update({
      where: { id: encargado.id },
      data: { email: ADMIN_EMAIL, passwordHash: hashPassword(ADMIN_PASSWORD), pin: null },
    })
  }
}
