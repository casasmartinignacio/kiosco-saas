import { PrismaClient } from '@prisma/client'
import { seedCatalog } from '../src/catalog-seed'

const prisma = new PrismaClient()

async function main() {
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.modifierOption.deleteMany()
  await prisma.modifierGroup.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.branch.deleteMany()
  await prisma.tenant.deleteMany()
  await seedCatalog(prisma)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
