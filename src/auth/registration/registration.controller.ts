import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RegistrationService } from './registration.service.js';
import { CustomerRegisterDto } from './dto/customer-register.dto.js';
import { VendorRegisterDto } from './dto/vendor-register.dto.js';
import { SendOtpDto } from '../otp/dto/send-otp.dto.js';
import { VerifyOtpDto } from '../otp/dto/verify-otp.dto.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import {
  createLogoStorage,
  imageFileFilter,
} from '../../common/upload/multer.config.js';

@ApiTags('Auth - Registration')
@Controller('auth')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post('customer/register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Customer account created successfully')
  @ApiOperation({
    summary: 'Customer Registration (No OTP needed)',
    description: 'Registers a normal customer account directly with name, email, and password.',
  })
  @ApiBody({ type: CustomerRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Customer registered successfully and tokens issued',
  })
  @ApiResponse({ status: 409, description: 'An account with this email already exists' })
  async registerCustomer(@Body() dto: CustomerRegisterDto) {
    return this.registrationService.registerCustomer(dto);
  }

  @Post('vendor/send-otp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('OTP code sent to email')
  @ApiOperation({
    summary: 'Vendor Registration - Step 1: Send Email OTP',
    description: 'Generates a 6-digit OTP code and delivers it to the prospective vendor’s business email.',
  })
  @ApiBody({ type: SendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP code generated and emailed',
  })
  @ApiResponse({ status: 409, description: 'Email is already registered and active' })
  async sendVendorOtp(@Body() dto: SendOtpDto) {
    return this.registrationService.sendVendorOtp(dto);
  }

  @Post('vendor/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('OTP verified successfully')
  @ApiOperation({
    summary: 'Vendor Registration - Step 2: Verify Email OTP',
    description: 'Validates the 6-digit OTP code entered by the vendor from their email.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  async verifyVendorOtp(@Body() dto: VerifyOtpDto) {
    return this.registrationService.verifyVendorOtp(dto);
  }

  @Post('vendor/register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: createLogoStorage('logos'),
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ResponseMessage('Vendor registration request submitted successfully')
  @ApiOperation({
    summary: 'Vendor Registration - Step 4: Submit Partner Application (Supports Multipart/Form-Data Logo Upload)',
    description:
      'Submits the complete 4-step vendor application. Accepts multipart/form-data with a `logo` image file or JSON. Status defaults to PENDING until approved by Administrator.',
  })
  @ApiBody({ type: VendorRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Vendor application submitted for admin review',
  })
  @ApiResponse({ status: 400, description: 'Email not verified via OTP or missing required fields' })
  @ApiResponse({ status: 409, description: 'Account with this email already exists' })
  async registerVendor(
    @Body() dto: VendorRegisterDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      dto.logo = `/uploads/logos/${file.filename}`;
    }
    return this.registrationService.registerVendor(dto);
  }
}
