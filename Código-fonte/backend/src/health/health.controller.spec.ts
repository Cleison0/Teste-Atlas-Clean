import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../shared/prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: queryRaw,
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('retorna ok quando o banco responde', async () => {
    const resposta = await controller.verificar();

    expect(resposta.status).toBe('ok');
    expect(resposta.database).toBe('up');
    expect(resposta.timestamp).toBeDefined();
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('retorna indisponivel quando o banco falha', async () => {
    queryRaw.mockRejectedValueOnce(new Error('database offline'));

    await expect(controller.verificar()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
