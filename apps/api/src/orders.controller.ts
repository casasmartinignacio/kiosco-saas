import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { DeviceGuard, StaffGuard } from './guards'
import { OrdersService } from './orders.service'

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(DeviceGuard)
  create(@Body() body: { paymentMethod?: string; beeperNumber?: string; items?: { productId?: string; quantity?: number; optionIds?: string[] }[] }) {
    return this.orders.create(body)
  }

  @Get('board')
  @UseGuards(StaffGuard)
  board() {
    return this.orders.board()
  }

  @Post(':id/advance')
  @UseGuards(StaffGuard)
  advance(@Param('id') id: string) {
    return this.orders.advance(id)
  }
}
