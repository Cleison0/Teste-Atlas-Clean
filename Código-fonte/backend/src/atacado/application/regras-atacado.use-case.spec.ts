import { RegraAtacado } from '../domain/regra-atacado.entity';
import { RegraAtacadoRepository } from '../domain/regra-atacado.repository';
import {
  RegraAtacadoAlvoInvalidoException,
  RegraAtacadoNaoEncontradaException,
  RegraAtacadoValorInvalidoException,
} from '../domain/regra-atacado.exceptions';
import { CriarRegraAtacadoUseCase } from './criar-regra-atacado.use-case';
import { AtualizarRegraAtacadoUseCase } from './atualizar-regra-atacado.use-case';
import { ListarRegrasAtacadoUseCase } from './listar-regras-atacado.use-case';

function criarRepositorioMock(): jest.Mocked<RegraAtacadoRepository> {
  return {
    buscarAplicaveis: jest.fn(),
    listarTodas: jest.fn(),
    buscarPorId: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
  } as unknown as jest.Mocked<RegraAtacadoRepository>;
}

function criarRegra(overrides: Partial<RegraAtacado> = {}): RegraAtacado {
  const semRestricaoExplicita = !('produtoId' in overrides) && !('categoriaId' in overrides);
  return new RegraAtacado(
    overrides.id ?? 'regra-1',
    overrides.quantidadeMinima ?? 12,
    overrides.tipoDesconto ?? 'PERCENTUAL',
    overrides.valor ?? 10,
    overrides.ativo ?? true,
    overrides.createdAt ?? new Date(),
    semRestricaoExplicita ? 'produto-1' : overrides.produtoId,
    overrides.categoriaId,
  );
}

describe('ListarRegrasAtacadoUseCase', () => {
  it('devolve todas as regras do repositório, ativas ou não', async () => {
    const repository = criarRepositorioMock();
    repository.listarTodas.mockResolvedValue([criarRegra()]);

    const useCase = new ListarRegrasAtacadoUseCase(repository);
    const resultado = await useCase.executar();

    expect(resultado).toHaveLength(1);
    expect(repository.listarTodas).toHaveBeenCalledTimes(1);
  });
});

describe('CriarRegraAtacadoUseCase', () => {
  it('cria a regra quando produtoId é informado sozinho', async () => {
    const repository = criarRepositorioMock();
    repository.criar.mockResolvedValue(criarRegra());

    const useCase = new CriarRegraAtacadoUseCase(repository);
    await useCase.executar({
      produtoId: 'produto-1',
      quantidadeMinima: 12,
      tipoDesconto: 'PERCENTUAL',
      valor: 10,
    });

    expect(repository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ produtoId: 'produto-1' }),
    );
  });

  it('lança RegraAtacadoAlvoInvalidoException sem persistir quando produtoId e categoriaId vêm juntos', async () => {
    const repository = criarRepositorioMock();

    const useCase = new CriarRegraAtacadoUseCase(repository);
    await expect(
      useCase.executar({
        produtoId: 'produto-1',
        categoriaId: 'categoria-1',
        quantidadeMinima: 12,
        tipoDesconto: 'PERCENTUAL',
        valor: 10,
      }),
    ).rejects.toBeInstanceOf(RegraAtacadoAlvoInvalidoException);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('lança RegraAtacadoAlvoInvalidoException sem persistir quando nenhum alvo é informado', async () => {
    const repository = criarRepositorioMock();

    const useCase = new CriarRegraAtacadoUseCase(repository);
    await expect(
      useCase.executar({ quantidadeMinima: 12, tipoDesconto: 'PERCENTUAL', valor: 10 }),
    ).rejects.toBeInstanceOf(RegraAtacadoAlvoInvalidoException);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('lança RegraAtacadoValorInvalidoException sem persistir quando o percentual é maior que 100', async () => {
    const repository = criarRepositorioMock();

    const useCase = new CriarRegraAtacadoUseCase(repository);
    await expect(
      useCase.executar({
        produtoId: 'produto-1',
        quantidadeMinima: 12,
        tipoDesconto: 'PERCENTUAL',
        valor: 150,
      }),
    ).rejects.toBeInstanceOf(RegraAtacadoValorInvalidoException);
    expect(repository.criar).not.toHaveBeenCalled();
  });
});

describe('AtualizarRegraAtacadoUseCase', () => {
  it('lança RegraAtacadoNaoEncontradaException quando a regra não existe', async () => {
    const repository = criarRepositorioMock();
    repository.buscarPorId.mockResolvedValue(null);

    const useCase = new AtualizarRegraAtacadoUseCase(repository);
    await expect(useCase.executar('inexistente', { ativo: false })).rejects.toBeInstanceOf(
      RegraAtacadoNaoEncontradaException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('valida a combinação resultante (existente + mudança) antes de persistir', async () => {
    const repository = criarRepositorioMock();
    repository.buscarPorId.mockResolvedValue(criarRegra({ tipoDesconto: 'PERCENTUAL', valor: 10 }));

    const useCase = new AtualizarRegraAtacadoUseCase(repository);
    // Só troca o valor — mas o tipoDesconto salvo (PERCENTUAL) continua valendo,
    // então 150 ainda é inválido mesmo sem tocar em tipoDesconto nesta chamada.
    await expect(useCase.executar('regra-1', { valor: 150 })).rejects.toBeInstanceOf(
      RegraAtacadoValorInvalidoException,
    );
    expect(repository.atualizar).not.toHaveBeenCalled();
  });

  it('atualiza quando a combinação resultante é válida', async () => {
    const repository = criarRepositorioMock();
    repository.buscarPorId.mockResolvedValue(criarRegra({ tipoDesconto: 'PERCENTUAL', valor: 10 }));
    repository.atualizar.mockResolvedValue(criarRegra({ ativo: false }));

    const useCase = new AtualizarRegraAtacadoUseCase(repository);
    await useCase.executar('regra-1', { ativo: false });

    expect(repository.atualizar).toHaveBeenCalledWith('regra-1', { ativo: false });
  });
});
