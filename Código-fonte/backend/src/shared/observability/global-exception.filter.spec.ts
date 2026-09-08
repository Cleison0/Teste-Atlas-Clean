import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { PinoLoggerService } from './pino-logger.service';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let logger: PinoLoggerService;

  beforeEach(() => {
    logger = {
      error: jest.fn(),
    } as unknown as PinoLoggerService;

    filter = new GlobalExceptionFilter(logger);
  });

  function criarHost() {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const request = {
      method: 'POST',
      originalUrl: '/teste',
      url: '/teste',
      requestId: 'request-123',
    };

    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    return { host, response };
  }

  it('padroniza erros de validacao', () => {
    const { host, response } = criarHost();

    filter.catch(
      new BadRequestException(['nome should not be empty', 'preco must be a number']),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        erro: 'VALIDACAO_FALHOU',
        mensagem: ['nome should not be empty', 'preco must be a number'],
        requestId: 'request-123',
        path: '/teste',
      }),
    );
  });

  it('nao expoe detalhes internos em erro inesperado', () => {
    const { host, response } = criarHost();

    filter.catch(new Error('senha-do-banco-nao-deve-aparecer'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        erro: 'ERRO_INTERNO',
        mensagem: 'Erro interno do servidor.',
        requestId: 'request-123',
      }),
    );

    const corpo = response.json.mock.calls[0][0];
    expect(JSON.stringify(corpo)).not.toContain('senha-do-banco-nao-deve-aparecer');

    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
