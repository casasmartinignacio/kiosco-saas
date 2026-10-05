import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

function header(context: ExecutionContext, name: string) {
  const req = context.switchToHttp().getRequest<{ header: (key: string) => string | undefined }>()
  return req.header(name)
}

@Injectable()
export class DeviceGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (header(context, 'x-device-key') !== process.env.DEVICE_KEY) {
      throw new UnauthorizedException()
    }
    return true
  }
}

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (header(context, 'x-staff-key') !== process.env.STAFF_KEY) {
      throw new UnauthorizedException()
    }
    return true
  }
}
