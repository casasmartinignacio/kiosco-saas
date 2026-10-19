import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common'
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
  customerCode?: string
  items?: { productId?: string; quantity?: number; optionIds?: string[]; note?: string }[]
}

function actor(value?: string) {
  return decodeURIComponent(value || '')
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
  counter(@Body() body: CreateBody, @Headers('x-staff-name') name?: string) {
    return this.orders.create(body, 'POS', actor(name))
  }

  @Get('documents')
  @UseGuards(StaffGuard)
  documents() {
    return this.orders.documents()
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

  @Get('unpaid')
  @UseGuards(StaffGuard)
  unpaid(@Query('number') number: string) {
    return this.orders.findUnpaid(Number(number))
  }

  @Post(':id/pay')
  @UseGuards(StaffGuard)
  pay(@Param('id') id: string, @Body() body: CreateBody, @Headers('x-staff-name') name?: string) {
    return this.orders.pay(id, body, actor(name))
  }

  @Get('lookup')
  @UseGuards(StaffGuard)
  lookup(@Query('number') number: string) {
    return this.orders.lookup(Number(number))
  }

  @Post(':id/advance')
  @UseGuards(StaffGuard)
  advance(@Param('id') id: string, @Headers('x-staff-name') name?: string) {
    return this.orders.advance(id, actor(name))
  }

  @Post(':id/deliver')
  @UseGuards(StaffGuard)
  deliver(@Param('id') id: string, @Headers('x-staff-name') name?: string) {
    return this.orders.deliver(id, actor(name))
  }

  @Post(':id/cancel')
  @UseGuards(StaffGuard)
  cancel(@Param('id') id: string, @Body() body: { reason?: string }, @Headers('x-staff-name') name?: string) {
    return this.orders.cancel(id, body.reason || '', actor(name))
  }

  @Post(':id/reprint')
  @UseGuards(StaffGuard)
  reprint(@Param('id') id: string, @Headers('x-staff-name') name?: string) {
    return this.orders.reprint(id, actor(name))
  }
}
