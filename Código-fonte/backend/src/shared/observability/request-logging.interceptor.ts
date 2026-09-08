import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PinoLoggerService } from './pino-logger.service';

export interface RequestComId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestComId>();
    const response = http.getResponse<Response>();

    const recebido = request.header('x-request-id')?.trim();
    const requestId = recebido && recebido.length <= 128 ? recebido : randomUUID();

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    const inicio = Date.now();

    this.logger.log({
      event: 'http_request_started',
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
    });

    return next.handle().pipe(
      finalize(() => {
        this.logger.log({
          event: 'http_request_finished',
          requestId,
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode: response.statusCode,
          durationMs: Date.now() - inicio,
        });
      }),
    );
  }
}
