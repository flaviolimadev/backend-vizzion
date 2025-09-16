import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    console.log('Health check endpoint called');
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
