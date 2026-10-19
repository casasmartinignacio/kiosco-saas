import { Body, Controller, Get, Headers, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { DeviceGuard, StaffGuard } from './guards'
import { StoreService } from './store.service'

@Controller()
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Post('staff/login')
  @UseGuards(StaffGuard)
  login(@Body() body: { pin?: string; email?: string; password?: string }) {
    return this.store.login(body || {})
  }

  @Get('customers/:code')
  @UseGuards(DeviceGuard)
  customer(@Param('code') code: string) {
    return this.store.customerByCode(code)
  }

  @Get('staff/customers')
  @UseGuards(StaffGuard)
  customers() {
    return this.store.customers()
  }

  @Post('staff/customers')
  @UseGuards(StaffGuard)
  saveCustomer(@Body() body: { id?: string; code?: string; name?: string; phone?: string }) {
    return this.store.saveCustomer(body)
  }

  @Get('staff/promotions')
  @UseGuards(StaffGuard)
  promotions() {
    return this.store.promotions()
  }

  @Post('staff/promotions')
  @UseGuards(StaffGuard)
  savePromotion(@Body() body: { id?: string; name?: string; kind?: string; value?: number; productId?: string | null; audience?: string; active?: boolean }) {
    return this.store.savePromotion(body)
  }

  @Get('staff/ingredients')
  @UseGuards(StaffGuard)
  ingredients() {
    return this.store.ingredients()
  }

  @Post('staff/ingredients')
  @UseGuards(StaffGuard)
  saveIngredient(@Body() body: { id?: string; name?: string; unit?: string; stock?: number }) {
    return this.store.saveIngredient(body)
  }

  @Get('staff/recipes/:productId')
  @UseGuards(StaffGuard)
  recipe(@Param('productId') productId: string) {
    return this.store.recipe(productId)
  }

  @Put('staff/recipes/:productId')
  @UseGuards(StaffGuard)
  saveRecipe(@Param('productId') productId: string, @Body() body: { lines?: { ingredientId?: string; quantity?: number }[] }) {
    return this.store.saveRecipe(productId, body.lines || [])
  }

  @Get('staff/users')
  @UseGuards(StaffGuard)
  users() {
    return this.store.users()
  }

  @Post('staff/users')
  @UseGuards(StaffGuard)
  saveUser(@Body() body: { id?: string; name?: string; pin?: string; email?: string; password?: string; currentPassword?: string; role?: string; active?: boolean }, @Headers('x-staff-name') actor?: string) {
    return this.store.saveUser(body, decodeURIComponent(actor || ''))
  }

  @Get('staff/shift')
  @UseGuards(StaffGuard)
  shift() {
    return this.store.shift()
  }

  @Post('staff/shift/open')
  @UseGuards(StaffGuard)
  open(@Body() body: { openingCashCrc?: number }, @Headers('x-staff-name') actor?: string) {
    return this.store.openShift(Number(body.openingCashCrc), decodeURIComponent(actor || ''))
  }

  @Post('staff/shift/close')
  @UseGuards(StaffGuard)
  close(@Body() body: { closingCashCrc?: number; note?: string }, @Headers('x-staff-name') actor?: string) {
    return this.store.closeShift(Number(body.closingCashCrc), decodeURIComponent(actor || ''), body.note || '')
  }

  @Get('staff/reports')
  @UseGuards(StaffGuard)
  report(@Query('from') from: string, @Query('to') to: string, @Query('range') range?: string) {
    return this.store.report(from, to, range)
  }

  @Get('staff/audit')
  @UseGuards(StaffGuard)
  audit() {
    return this.store.audit()
  }

  @Get('staff/settings')
  @UseGuards(StaffGuard)
  settings() {
    return this.store.settings()
  }

  @Get('devices')
  @UseGuards(DeviceGuard)
  devices() {
    return this.store.devices()
  }

  @Patch('staff/settings')
  @UseGuards(StaffGuard)
  saveSettings(@Body() body: { name?: string; idleSeconds?: number; legalId?: string; tradeName?: string; cabysDefault?: string; terminalUrl?: string; printers?: { name?: string; host?: string }[]; terminals?: { id: string; name: string }[] }, @Headers('x-staff-name') actor?: string) {
    return this.store.saveSettings(body, decodeURIComponent(actor || ''))
  }
}
