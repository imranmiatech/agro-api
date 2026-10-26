import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LoginService } from './login.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@ApiTags('Auth - Login')
@Controller('auth')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged in successfully')
  @ApiOperation({
    summary: 'Universal Login (Customer, Vendor, Admin)',
    description:
      'Authenticates users with email and password. Checks vendor approval status: returns 403 Forbidden if pending, rejected, or suspended by Admin.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful and access/refresh tokens issued',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Logged in successfully',
        data: {
          message: 'Login successful',
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'u1d2e3f4-5678-90ab-cdef-1234567890ef',
            name: 'Jane Smith',
            email: 'hello@business.com',
            role: 'VENDOR',
            status: 'INACTIVE',
            vendorProfile: {
              id: 'v1d2e3f4-5678-90ab-cdef-1234567890cd',
              businessName: 'Little Stars Nursery',
              slug: 'little-stars-nursery-4891',
              logo: 'https://images.unsplash.com/...',
              status: 'APPROVED',
            },
          },
        },
        timestamp: '2026-10-20T09:50:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiResponse({ status: 403, description: 'Vendor account pending approval, rejected, or suspended' })
  async login(@Body() dto: LoginDto) {
    return this.loginService.login(dto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tokens refreshed successfully')
  @ApiOperation({
    summary: 'Refresh Access and Refresh Tokens',
    description: 'Generates a fresh access token and refresh token using a valid, unexpired refresh token.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Tokens refreshed successfully',
        data: {
          message: 'Tokens refreshed successfully',
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        timestamp: '2026-10-20T09:50:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.loginService.refreshTokens(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ResponseMessage('Logged out successfully')
  @ApiOperation({
    summary: 'Logout User (Universal)',
    description:
      'Terminates user session, clears server-side authentication cookies (if present), and returns logout confirmation.',
  })
  @ApiBody({ type: LogoutDto, required: false })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Logged out successfully',
        data: {
          message: 'Logged out successfully',
        },
        timestamp: '2026-10-26T09:50:00.000Z',
      },
    },
  })
  async logout(
    @Res({ passthrough: true }) res?: Response,
    @Body() dto?: LogoutDto,
  ) {
    return this.loginService.logout(res, dto?.refreshToken);
  }
}

