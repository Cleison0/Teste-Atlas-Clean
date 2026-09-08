import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { PinoLoggerService } from './pino-logger.service';

describe('RequestLoggingInterceptor', () => {
  const criarContexto = (requestId?: string) => {
    const headers: Record<string, string> = {};

    const request: {
      method: string;
      originalUrl: string;
      url: string;
      requestId?: string;
      header: jest.Mock;
    } = {
      method: 'GET',
      originalUrl: '/health',
      url: '/health',
      header: jest.fn((nome: string) => (nome === 'x-request-id' ? requestId : undefined)),
    };

    const response = {
      statusCode: 200,
      setHeader: jest.fn((nome: string, valor: string) => {
        headers[nome] = valor;
      }),
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    return { context, request, response, headers };
  };

  it('gera request-id quando o cliente nao envia um', async () => {
    const logger = {
      log: jest.fn(),
    } as unknown as PinoLoggerService;

    const interceptor = new RequestLoggingInterceptor(logger);
    const { context, request, response } = criarContexto();

    const next: CallHandler = {
      handle: () => of({ ok: true }),
    };

    await lastValueFrom(interceptor.intercept(context, next));

    expect(request).toHaveProperty('requestId');
    expect(response.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    expect(logger.log).toHaveBeenCalledTimes(2);
  });

  it('propaga um x-request-id valido recebido do cliente', async () => {
    const logger = {
      log: jest.fn(),
    } as unknown as PinoLoggerService;

    const interceptor = new RequestLoggingInterceptor(logger);
    const { context, request, response } = criarContexto('req-teste-123');

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of({ ok: true }),
      }),
    );

    expect(request.requestId).toBe('req-teste-123');
    expect(response.setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-teste-123');
  });
});
