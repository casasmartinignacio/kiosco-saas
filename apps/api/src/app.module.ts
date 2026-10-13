import { Module } from '@nestjs/common'
import { CatalogController } from './catalog.controller'
import { CatalogService } from './catalog.service'
import { HealthController } from './health.controller'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { PrismaService } from './prisma.service'
import { StoreController } from './store.controller'
import { StoreService } from './store.service'

@Module({
  controllers: [HealthController, CatalogController, OrdersController, StoreController],
  providers: [PrismaService, CatalogService, OrdersService, StoreService],
})
export class AppModule {}
