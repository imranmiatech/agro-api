import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_METADATA = 'response_message';

/**
 * Decorator to define a custom response message on any controller handler.
 *
 * Example:
 * @Get('profile')
 * @ResponseMessage('User profile retrieved successfully')
 * getProfile() { ... }
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_METADATA, message);
