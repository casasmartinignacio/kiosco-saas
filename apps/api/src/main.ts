import 'dotenv/config'
import 'reflect-metadata'
import { PrismaClient } from '@prisma/client'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { seedIfEmpty } from './catalog-seed'

async function bootstrap() {
  const prisma = new PrismaClient()
  await seedIfEmpty(prisma)
  await prisma.$disconnect()

  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('v1')
  await app.listen(process.env.PORT || 3001)
}

bootstrap()
