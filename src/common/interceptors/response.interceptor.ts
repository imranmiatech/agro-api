import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_METADATA } from '../decorators/response-message.decorator.js';

export interface StandardApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Global response interceptor that formats all successful responses
 * into a unified, consistent, and beautiful JSON envelope.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardApiResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    // For non-HTTP contexts (e.g. WebSockets, RPC), bypass the HTTP response envelope
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    if (!response) {
      return next.handle();
    }

    // Skip Swagger documentation UI and JSON endpoints
    if (request?.url?.includes('/api/docs')) {
      return next.handle();
    }

    const statusCode = response.statusCode ?? 200;

    // Retrieve custom message set by @ResponseMessage() decorator, or default
    const customMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_METADATA,
      context.getHandler(),
    );

    const message = customMessage || this.getDefaultMessage(statusCode);

    return next.handle().pipe(
      map((resData) => {
        // Bypass JSON envelop for Buffer, binary streams, and PDF responses
        const contentType =
          typeof response.getHeader === 'function'
            ? response.getHeader('content-type')?.toString() || ''
            : '';

        if (
          Buffer.isBuffer(resData) ||
          contentType.includes('application/pdf') ||
          contentType.includes('octet-stream')
        ) {
          return resData;
        }

        // If the handler already returned an object structured with data/message
        if (
          resData &&
          typeof resData === 'object' &&
          'data' in resData &&
          'message' in resData
        ) {
          return {
            success: true,
            statusCode,
            message: resData.message || message,
            data: resData.data,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          statusCode,
          message,
          data: resData ?? null,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 201:
        return 'Resource created successfully';
      case 204:
        return 'Operation completed successfully';
      default:
        return 'Success';
    }
  }
}
