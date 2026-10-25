import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BillingService } from './billing.service.js';
import { SaveCardDto } from './dto/save-card.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdateCommissionDto } from './dto/update-commission.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Billing & Stripe Payments')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('commission')
  @ResponseMessage('Platform commission setting retrieved successfully')
  @ApiOperation({
    summary: 'Get Platform Commission Percentage & Payout Settings',
    description: 'Retrieves current Admin commission percentage and the 10-minute automated vendor payout configuration.',
  })
  @ApiResponse({ status: 200, description: 'Commission settings retrieved successfully' })
  async getCommission() {
    return this.billingService.getCommissionSettings();
  }

  @Patch('commission')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Platform commission percentage updated successfully')
  @ApiOperation({
    summary: 'Update Platform Commission Percentage (Admin Only)',
    description:
      'Configures and fixes the percentage fee retained by Admin on every product sale before the 10-minute vendor payout.',
  })
  @ApiBody({ type: UpdateCommissionDto })
  @ApiResponse({ status: 200, description: 'Commission setting updated successfully' })
  @ApiResponse({ status: 403, description: 'Only platform administrators can configure commission settings' })
  async updateCommission(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommissionDto,
  ) {
    return this.billingService.updateCommissionRate(user, dto);
  }

  @Get('cards')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Saved payment cards retrieved successfully')
  @ApiOperation({
    summary: 'List Saved Cards (Admin & Vendor)',
    description:
      'Retrieves all tokenized payment cards saved in the Stripe vault for the authenticated Admin or Vendor.',
  })
  @ApiResponse({ status: 200, description: 'Cards retrieved successfully' })
  async getCards(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getSavedCards(user);
  }

  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Card saved successfully to vault')
  @ApiOperation({
    summary: 'Save / Vault Card Details (Admin & Vendor)',
    description:
      'Tokenizes card through Stripe vault, attaches to user customer profile, and stores PCI-compliant masked card record.',
  })
  @ApiBody({ type: SaveCardDto })
  @ApiResponse({ status: 201, description: 'Card vaulted and saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid card details' })
  async saveCard(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveCardDto,
  ) {
    return this.billingService.saveCard(user, dto);
  }

  @Patch('cards/:id/default')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Default card updated successfully')
  @ApiOperation({
    summary: 'Set Default Payment Card (Admin & Vendor)',
    description: 'Marks the selected card as the default method for settlements and fees.',
  })
  @ApiParam({ name: 'id', description: 'Saved card ID' })
  @ApiResponse({ status: 200, description: 'Default card updated successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async setDefaultCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') cardId: string,
  ) {
    return this.billingService.setDefaultCard(user, cardId);
  }

  @Delete('cards/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Card removed successfully')
  @ApiOperation({
    summary: 'Delete Saved Card (Admin & Vendor)',
    description: 'Detaches payment method from Stripe and deletes record from vault.',
  })
  @ApiParam({ name: 'id', description: 'Saved card ID to delete' })
  @ApiResponse({ status: 200, description: 'Card deleted successfully' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async deleteCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') cardId: string,
  ) {
    return this.billingService.deleteCard(user, cardId);
  }

  @Post('pay')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Payment processed; vendor payout scheduled')
  @ApiOperation({
    summary: 'Process Marketplace Payment (100% to Admin, 2% Commission, 98% Vendor Payout in 5-10min)',
    description:
      'Accepts customer payment via Stripe. Charges 100% directly to the Admin Stripe account, automatically retains 2% platform commission, and queues 98% balance for automatic vendor payout in 5-10 minutes.',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Payment successful, vendor payout queued' })
  async processPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.billingService.createPaymentAndSchedulePayout(user || null, dto);
  }

  @Get('transactions')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Transactions retrieved successfully')
  @ApiOperation({
    summary: 'List Settlement Transactions & Payouts (Admin & Vendor)',
    description:
      'Returns payment records showing gross amount, 2% admin commission fee, and 98% vendor payout status.',
  })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(@CurrentUser() user: AuthenticatedUser) {
    return this.billingService.getTransactions(user);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe Webhook Listener',
    description: 'Receives signed webhook events from Stripe gateway.',
  })
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody || req.body;
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
