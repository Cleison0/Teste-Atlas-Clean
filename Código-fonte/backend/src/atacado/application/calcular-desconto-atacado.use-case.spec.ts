import { CalcularDescontoAtacadoUseCase } from './calcular-desconto-atacado.use-case';
import { RegraAtacadoRepository } from '../domain/regra-atacado.repository';
import { RegraAtacado } from '../domain/regra-atacado.entity';

function criarRegra(overrides: Partial<RegraAtacado> = {}): RegraAtacado {
  return new RegraAtacado(
    overrides.id ?? 'regra-1',
    overrides.quantidadeMinima ?? 12,
    overrides.tipoDesconto ?? 'PERCENTUAL',
    overrides.valor ?? 10,
    overrides.ativo ?? true,
    overrides.createdAt ?? new Date(),
    overrides.produtoId,
    overrides.categoriaId,
  );
}

describe('CalcularDescontoAtacadoUseCase', () => {
  let repository: jest.Mocked<RegraAtacadoRepository>;
  let useCase: CalcularDescontoAtacadoUseCase;

  beforeEach(() => {
    repository = { buscarAplicaveis: jest.fn() } as unknown as jest.Mocked<RegraAtacadoRepository>;
    useCase = new CalcularDescontoAtacadoUseCase(repository);
  });

  it('devolve mapa vazio sem consultar o repositório quando não há itens', async () => {
    const resultado = await useCase.executar([]);
    expect(resultado.size).toBe(0);
    expect(repository.buscarAplicaveis).not.toHaveBeenCalled();
  });

  it('devolve mapa vazio quando nenhuma regra se aplica (quantidade abaixo do mínimo)', async () => {
    repository.buscarAplicaveis.mockResolvedValue([
      criarRegra({ produtoId: 'produto-1', quantidadeMinima: 12 }),
    ]);

    const resultado = await useCase.executar([
      { produtoId: 'produto-1', quantidade: 5, precoUnitario: 10 },
    ]);

    expect(resultado.size).toBe(0);
  });

  it('calcula o desconto do item quando a quantidade atinge o mínimo da regra', async () => {
    repository.buscarAplicaveis.mockResolvedValue([
      criarRegra({
        produtoId: 'produto-1',
        quantidadeMinima: 12,
        tipoDesconto: 'PERCENTUAL',
        valor: 10,
      }),
    ]);

    const resultado = await useCase.executar([
      { produtoId: 'produto-1', quantidade: 12, precoUnitario: 10 },
    ]);

    expect(resultado.get('produto-1')).toBe(12); // 10% de 120
  });

  it('ignora regras inativas', async () => {
    repository.buscarAplicaveis.mockResolvedValue([
      criarRegra({ produtoId: 'produto-1', quantidadeMinima: 12, ativo: false }),
    ]);

    const resultado = await useCase.executar([
      { produtoId: 'produto-1', quantidade: 12, precoUnitario: 10 },
    ]);

    expect(resultado.size).toBe(0);
  });

  it('quando mais de uma regra se aplica ao mesmo item, usa a que dá mais desconto', async () => {
    repository.buscarAplicaveis.mockResolvedValue([
      criarRegra({
        produtoId: 'produto-1',
        quantidadeMinima: 12,
        tipoDesconto: 'PERCENTUAL',
        valor: 5,
      }),
      criarRegra({
        id: 'regra-2',
        categoriaId: 'cat-limpeza',
        produtoId: undefined,
        quantidadeMinima: 12,
        tipoDesconto: 'PERCENTUAL',
        valor: 15,
      }),
    ]);

    const resultado = await useCase.executar([
      { produtoId: 'produto-1', categoriaId: 'cat-limpeza', quantidade: 12, precoUnitario: 10 },
    ]);

    expect(resultado.get('produto-1')).toBe(18); // 15% de 120, não 5%
  });

  it('busca regras aplicáveis passando os produtoIds e categoriaIds dos itens', async () => {
    repository.buscarAplicaveis.mockResolvedValue([]);

    await useCase.executar([
      { produtoId: 'produto-1', categoriaId: 'cat-1', quantidade: 1, precoUnitario: 10 },
      { produtoId: 'produto-2', quantidade: 1, precoUnitario: 10 },
    ]);

    expect(repository.buscarAplicaveis).toHaveBeenCalledWith(['produto-1', 'produto-2'], ['cat-1']);
  });
});
