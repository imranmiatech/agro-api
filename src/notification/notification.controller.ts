import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { NotificationService } from './notification.service.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ResponseMessage('Notifications retrieved successfully')
  @ApiOperation({
    summary: 'Get Role-Based Notifications for Logged-in User',
    description:
      'Returns paginated notifications and unread count strictly scoped to the authenticated user and their role (ADMIN, VENDOR, EXPERT, CUSTOMER).',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.getMyNotifications(user, query);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('All notifications marked as read')
  @ApiOperation({
    summary: 'Mark All Notifications as Read',
    description:
      'Marks all unread notifications for the authenticated user and role as read.',
  })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.markAllAsRead(user);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Notification marked as read')
  @ApiOperation({
    summary: 'Mark Single Notification as Read',
    description:
      'Marks a specific notification belonging to the authenticated user as read.',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationService.markAsRead(user, id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('All notifications deleted successfully')
  @ApiOperation({
    summary: 'Delete All Notifications (Role-Scoped)',
    description:
      'Permanently deletes all notifications belonging to the authenticated user and their role.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications deleted successfully',
  })
  async deleteAllNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.deleteAll(user);
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('All notifications deleted successfully')
  @ApiOperation({
    summary: 'Delete All Notifications (Alias)',
    description:
      'Alias endpoint to delete all notifications belonging to the authenticated user and their role.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications deleted successfully',
  })
  async deleteAllNotificationsAlias(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.deleteAll(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Notification deleted successfully')
  @ApiOperation({
    summary: 'Delete Single Notification',
    description:
      'Permanently deletes a single notification belonging to the authenticated user and their role.',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationService.deleteOne(user, id);
  }
}
