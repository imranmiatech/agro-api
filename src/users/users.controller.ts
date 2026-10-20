import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UserMetricsDataDto } from './dto/user-metrics.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('metrics')
  @ResponseMessage('User metrics retrieved successfully')
  @ApiOperation({
    summary: 'Get User Metrics for Admin Dashboard',
    description:
      'Provides aggregated metrics including Total Users, Active Today, New This Week, New This Month, and Suspended Users with growth percentage trends and UI-ready card data.',
  })
  @ApiResponse({
    status: 200,
    description: 'User metrics aggregated successfully',
    type: UserMetricsDataDto,
  })
  async getUserMetrics() {
    return this.usersService.getUserMetrics();
  }

  @Get('admin/metrics')
  @ResponseMessage('User metrics retrieved successfully')
  @ApiOperation({
    summary: 'Get User Metrics (Admin Alias)',
    description: 'Alias route for /users/metrics for admin integrations.',
  })
  async getAdminUserMetrics() {
    return this.usersService.getUserMetrics();
  }

  @Get()
  @ResponseMessage('Users list retrieved successfully')
  @ApiOperation({
    summary: 'List All Registered Users',
    description:
      'Retrieves paginated users with optional search by name or email, role filter, and status filter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated user list retrieved successfully',
  })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAllUsers(query);
  }

  @Get(':id')
  @ResponseMessage('User retrieved successfully')
  @ApiOperation({
    summary: 'Get User Details by ID',
    description: 'Retrieves complete user information including store profile if vendor.',
  })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOneUser(id);
  }

  @Patch(':id/status')
  @ResponseMessage('User status updated successfully')
  @ApiOperation({
    summary: 'Update User Status (Admin)',
    description: 'Updates account status to ACTIVE, INACTIVE, or SUSPENDED.',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateUserStatus(id, dto);
  }
}
