import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { DeviceGuard, StaffGuard } from './guards'
import { OrdersService } from './orders.service'

type CreateBody = {
  paymentMethod?: string
  beeperNumber?: string
  note?: string
  idempotencyKey?: string
  receiptKind?: string
  customerName?: string
  customerTaxId?: string
  items?: { productId?: string; quantity?: number; optionIds?: string[]; note?: string }[]
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(DeviceGuard)
  create(@Body() body: CreateBody) {
    return this.orders.create(body, 'KIOSK')
  }

  @Post('counter')
  @UseGuards(StaffGuard)
  counter(@Body() body: CreateBody) {
    return this.orders.create(body, 'POS')
  }

  @Get('board')
  @UseGuards(StaffGuard)
  board() {
    return this.orders.board()
  }

  @Get('ready')
  ready() {
    return this.orders.ready()
  }

  @Get('summary')
  @UseGuards(StaffGuard)
  summary() {
    return this.orders.summary()
  }

  @Get('lookup')
  @UseGuards(StaffGuard)
  lookup(@Query('number') number: string) {
    return this.orders.lookup(Number(number))
  }

  @Post(':id/advance')
  @UseGuards(StaffGuard)
  advance(@Param('id') id: string) {
    return this.orders.advance(id)
  }

  @Post(':id/deliver')
  @UseGuards(StaffGuard)
  deliver(@Param('id') id: string) {
    return this.orders.deliver(id)
  }

  @Post(':id/cancel')
  @UseGuards(StaffGuard)
  cancel(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.orders.cancel(id, body.reason || '')
  }

  @Post(':id/reprint')
  @UseGuards(StaffGuard)
  reprint(@Param('id') id: string) {
    return this.orders.reprint(id)
  }
}
