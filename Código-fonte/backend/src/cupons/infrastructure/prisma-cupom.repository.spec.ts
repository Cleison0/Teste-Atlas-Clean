// Testes do PrismaCupomRepository focados no incremento atômico de usosCount: um
// UPDATE condicional (usos_count < uso_maximo OU uso_maximo IS NULL) roda como uma
// única instrução SQL — é isso que garante que duas confirmações de pagamento
// simultâneas na última vaga do cupom nunca conseguem passar as duas (mesmo padrão
// de PrismaProdutoRepository.decrementarEstoque pro estoque).
import { PrismaCupomRepository } from './prisma-cupom.repository';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CupomEsgotadoException } from '../domain/cupons.exceptions';

describe('PrismaCupomRepository.incrementarUsos', () => {
  let executeRawMock: jest.Mock;
  let repository: PrismaCupomRepository;

  beforeEach(() => {
    executeRawMock = jest.fn();
    const prisma = { $executeRaw: executeRawMock };
    repository = new PrismaCupomRepository(prisma as unknown as PrismaService);
  });

  it('incrementa quando o UPDATE condicional afeta uma linha (ainda dentro do limite, ou sem limite)', async () => {
    executeRawMock.mockResolvedValue(1);

    await expect(repository.incrementarUsos('DESCONTO10')).resolves.toBeUndefined();
    expect(executeRawMock).toHaveBeenCalledTimes(1);
  });

  it('lança CupomEsgotadoException quando o UPDATE condicional não afeta nenhuma linha (já no limite — corrida perdida)', async () => {
    executeRawMock.mockResolvedValue(0);

    await expect(repository.incrementarUsos('DESCONTO10')).rejects.toBeInstanceOf(
      CupomEsgotadoException,
    );
  });

  it('usa o client de transação recebido no contexto, não o client padrão', async () => {
    const executeRawDaTransacao = jest.fn().mockResolvedValue(1);
    const contexto = { $executeRaw: executeRawDaTransacao };

    await repository.incrementarUsos('DESCONTO10', contexto);

    expect(executeRawDaTransacao).toHaveBeenCalledTimes(1);
    expect(executeRawMock).not.toHaveBeenCalled();
  });
});

describe('PrismaCupomRepository.incrementarUsoCliente/decrementarUsoCliente', () => {
  let upsertMock: jest.Mock;
  let updateMock: jest.Mock;
  let repository: PrismaCupomRepository;

  beforeEach(() => {
    upsertMock = jest.fn();
    updateMock = jest.fn();
    const prisma = { cupomUsoCliente: { upsert: upsertMock, update: updateMock } };
    repository = new PrismaCupomRepository(prisma as unknown as PrismaService);
  });

  it('incrementarUsoCliente faz upsert (cria com usos:1 se não existir, incrementa se já existir)', async () => {
    await repository.incrementarUsoCliente('DESCONTO10', 'cliente-1');

    expect(upsertMock).toHaveBeenCalledWith({
      where: { cupomCodigo_clienteId: { cupomCodigo: 'DESCONTO10', clienteId: 'cliente-1' } },
      create: { cupomCodigo: 'DESCONTO10', clienteId: 'cliente-1', usos: 1 },
      update: { usos: { increment: 1 } },
    });
  });

  it('decrementarUsoCliente decrementa o registro existente', async () => {
    await repository.decrementarUsoCliente('DESCONTO10', 'cliente-1');

    expect(updateMock).toHaveBeenCalledWith({
      where: { cupomCodigo_clienteId: { cupomCodigo: 'DESCONTO10', clienteId: 'cliente-1' } },
      data: { usos: { decrement: 1 } },
    });
  });
});
