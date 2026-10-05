import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { CatalogService } from './catalog.service'
import { DeviceGuard, StaffGuard } from './guards'

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('catalog')
  @UseGuards(DeviceGuard)
  getCatalog() {
    return this.catalog.catalog()
  }

  @Get('products')
  @UseGuards(StaffGuard)
  list() {
    return this.catalog.listProducts()
  }

  @Patch('products/:id')
  @UseGuards(StaffGuard)
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; priceCrc?: number; active?: boolean },
  ) {
    return this.catalog.updateProduct(id, body)
  }
}
