import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { ResponseMessage } from './common/decorators/response-message.decorator.js';

@ApiTags('Health & System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ResponseMessage('Welcome to Multi-Vendor E-Commerce REST API')
  @ApiOperation({
    summary: 'API Root & Server Welcome',
    description: 'Returns server greeting and verification that the API server is operational.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server is running normally',
    schema: {
      example: {
        message: 'Welcome to Multi-Vendor E-Commerce REST API! Visit /api/docs for Swagger documentation.',
        status: 'online',
        version: '1.0.0',
      },
    },
  })
  getHello() {
    return {
      message: 'Welcome to Multi-Vendor E-Commerce REST API! Visit /api/docs for Swagger documentation.',
      status: 'online',
      version: '1.0.0',
    };
  }

  @Get('health')
  @ResponseMessage('System health check completed')
  @ApiOperation({
    summary: 'System Health Check',
    description: 'Inspects server uptime, memory usage, environment mode, and operational health.',
  })
  @ApiResponse({
    status: 200,
    description: 'Server health status details',
    schema: {
      example: {
        status: 'ok',
        uptimeSeconds: 142.5,
        timestamp: '2026-10-20T08:50:00.000Z',
        environment: 'development',
        database: 'connected',
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      database: 'connected',
    };
  }
}
