import { Module } from '@nestjs/common'
import { CatalogController } from './catalog.controller'
import { CatalogService } from './catalog.service'
import { HealthController } from './health.controller'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { PrismaService } from './prisma.service'

@Module({
  controllers: [HealthController, CatalogController, OrdersController],
  providers: [PrismaService, CatalogService, OrdersService],
})
export class AppModule {}
