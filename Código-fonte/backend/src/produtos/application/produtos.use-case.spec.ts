import { Produto } from '../domain/produto.entity';
import { ProdutoRepository } from '../domain/produto.repository';
import {
  PrecoPromocionalInvalidoException,
  ProdutoNaoEncontradoException,
} from '../domain/produtos.exceptions';
import { AlternarStatusProdutoUseCase } from './alternar-status-produto.use-case';
import { AtualizarProdutoUseCase } from './atualizar-produto.use-case';
import { CriarProdutoUseCase } from './criar-produto.use-case';
import { ListarProdutosUseCase } from './listar-produtos.use-case';
import { ListarProdutosMaisVendidosUseCase } from './listar-produtos-mais-vendidos.use-case';

function criarProduto(overrides: Partial<Produto> = {}): Produto {
  return new Produto(
    overrides.id ?? 'prod-1',
    overrides.nome ?? 'Detergente',
    overrides.slug ?? 'detergente',
    overrides.preco ?? 19.9,
    overrides.estoque ?? 10,
    overrides.ativo ?? true,
    overrides.descricao ?? 'Detergente para limpeza pesada',
    overrides.categoria ?? 'Limpeza',
    overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    overrides.updatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
  );
}

describe('CriarProdutoUseCase', () => {
  let produtoRepository: jest.Mocked<ProdutoRepository>;
  let useCase: CriarProdutoUseCase;

  beforeEach(() => {
    produtoRepository = {
      listarTodos: jest.fn(),
      listarComFiltros: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorIds: jest.fn(),
      buscarPorSlug: jest.fn(),
      criar: jest.fn(),
      atualizar: jest.fn(),
    } as unknown as jest.Mocked<ProdutoRepository>;

    useCase = new CriarProdutoUseCase(produtoRepository);
  });

  it('gera slug único quando o nome já existe em outro produto', async () => {
    produtoRepository.buscarPorSlug.mockResolvedValueOnce(
      criarProduto({ id: 'prod-2', slug: 'detergente' }),
    );
    produtoRepository.buscarPorSlug.mockResolvedValueOnce(null);
    produtoRepository.criar.mockResolvedValue(criarProduto({ id: 'prod-3', slug: 'detergente-2' }));

    const result = await useCase.executar({
      nome: 'Detergente',
      preco: 29.9,
      estoque: 8,
      descricao: 'Versão concentrada',
      categoria: 'Limpeza',
    });

    expect(produtoRepository.buscarPorSlug).toHaveBeenNthCalledWith(1, 'detergente');
    expect(produtoRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Detergente',
        slug: 'detergente-2',
        preco: 29.9,
        estoque: 8,
        categoria: 'Limpeza',
      }),
    );
    expect(result.slug).toBe('detergente-2');
  });

  it('rejeita preço promocional maior ou igual ao preço normal', async () => {
    await expect(
      useCase.executar({ nome: 'Detergente', preco: 20, precoPromocional: 20 }),
    ).rejects.toThrow(PrecoPromocionalInvalidoException);

    expect(produtoRepository.criar).not.toHaveBeenCalled();
  });

  it('aceita preço promocional válido e repassa pro repositório', async () => {
    produtoRepository.buscarPorSlug.mockResolvedValue(null);
    produtoRepository.criar.mockResolvedValue(criarProduto());

    await useCase.executar({ nome: 'Detergente', preco: 20, precoPromocional: 15 });

    expect(produtoRepository.criar).toHaveBeenCalledWith(
      expect.objectContaining({ precoPromocional: 15 }),
    );
  });
});

describe('AtualizarProdutoUseCase', () => {
  let produtoRepository: jest.Mocked<ProdutoRepository>;
  let useCase: AtualizarProdutoUseCase;

  beforeEach(() => {
    produtoRepository = {
      listarTodos: jest.fn(),
      listarComFiltros: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorIds: jest.fn(),
      buscarPorSlug: jest.fn(),
      criar: jest.fn(),
      atualizar: jest.fn(),
    } as unknown as jest.Mocked<ProdutoRepository>;

    useCase = new AtualizarProdutoUseCase(produtoRepository);
  });

  it('preserva o slug quando o nome não muda', async () => {
    const existente = criarProduto({ id: 'prod-1', slug: 'detergente', nome: 'Detergente' });
    produtoRepository.buscarPorId.mockResolvedValue(existente);
    produtoRepository.atualizar.mockResolvedValue(existente);

    await useCase.executar('prod-1', {
      preco: 23.5,
      estoque: 12,
    });

    expect(produtoRepository.atualizar).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({
        nome: undefined,
        slug: 'detergente',
        preco: 23.5,
        estoque: 12,
      }),
    );
  });

  it('regenera o slug e adiciona sufixo quando o novo nome entra em conflito', async () => {
    const existente = criarProduto({ id: 'prod-1', slug: 'detergente', nome: 'Detergente' });
    produtoRepository.buscarPorId.mockResolvedValue(existente);
    produtoRepository.buscarPorSlug.mockResolvedValueOnce(
      criarProduto({ id: 'prod-2', slug: 'limpeza-eficiente' }),
    );
    produtoRepository.buscarPorSlug.mockResolvedValueOnce(null);
    produtoRepository.atualizar.mockResolvedValue(
      criarProduto({ id: 'prod-1', nome: 'Limpeza eficiente', slug: 'limpeza-eficiente-2' }),
    );

    await useCase.executar('prod-1', {
      nome: 'Limpeza eficiente',
      preco: 39.9,
    });

    expect(produtoRepository.buscarPorSlug).toHaveBeenNthCalledWith(1, 'limpeza-eficiente');
    expect(produtoRepository.atualizar).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({
        nome: 'Limpeza eficiente',
        slug: 'limpeza-eficiente-2',
      }),
    );
  });

  it('rejeita preço promocional maior ou igual ao preço enviado no dto', async () => {
    produtoRepository.buscarPorId.mockResolvedValue(criarProduto({ preco: 50 }));

    await expect(useCase.executar('prod-1', { preco: 30, precoPromocional: 30 })).rejects.toThrow(
      PrecoPromocionalInvalidoException,
    );

    expect(produtoRepository.atualizar).not.toHaveBeenCalled();
  });

  it('rejeita preço promocional maior ou igual ao preço existente quando preco não vem no dto', async () => {
    produtoRepository.buscarPorId.mockResolvedValue(criarProduto({ preco: 20 }));

    await expect(useCase.executar('prod-1', { precoPromocional: 25 })).rejects.toThrow(
      PrecoPromocionalInvalidoException,
    );
  });

  it('permite null pra remover a promoção sem validar contra o preço', async () => {
    const existente = criarProduto({ preco: 20 });
    produtoRepository.buscarPorId.mockResolvedValue(existente);
    produtoRepository.atualizar.mockResolvedValue(existente);

    await useCase.executar('prod-1', { precoPromocional: null });

    expect(produtoRepository.atualizar).toHaveBeenCalledWith(
      'prod-1',
      expect.objectContaining({ precoPromocional: null }),
    );
  });
});

describe('AlternarStatusProdutoUseCase', () => {
  let produtoRepository: jest.Mocked<ProdutoRepository>;
  let useCase: AlternarStatusProdutoUseCase;

  beforeEach(() => {
    produtoRepository = {
      listarTodos: jest.fn(),
      listarComFiltros: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorIds: jest.fn(),
      buscarPorSlug: jest.fn(),
      criar: jest.fn(),
      atualizar: jest.fn(),
    } as unknown as jest.Mocked<ProdutoRepository>;

    useCase = new AlternarStatusProdutoUseCase(produtoRepository);
  });

  it('ativa um produto existente sem removê-lo do banco', async () => {
    const produto = criarProduto({ id: 'prod-1', ativo: false });
    produtoRepository.buscarPorId.mockResolvedValue(produto);
    produtoRepository.atualizar.mockResolvedValue(produto.ativar());

    const result = await useCase.ativar('prod-1');

    expect(produtoRepository.atualizar).toHaveBeenCalledWith('prod-1', { ativo: true });
    expect(result.ativo).toBe(true);
  });

  it('desativa um produto existente e mantém o histórico', async () => {
    const produto = criarProduto({ id: 'prod-2', ativo: true });
    produtoRepository.buscarPorId.mockResolvedValue(produto);
    produtoRepository.atualizar.mockResolvedValue(produto.desativar());

    const result = await useCase.desativar('prod-2');

    expect(produtoRepository.atualizar).toHaveBeenCalledWith('prod-2', { ativo: false });
    expect(result.ativo).toBe(false);
  });

  it('lança exceção quando o produto não existe', async () => {
    produtoRepository.buscarPorId.mockResolvedValue(null);

    await expect(useCase.ativar('inexistente')).rejects.toBeInstanceOf(
      ProdutoNaoEncontradoException,
    );
    await expect(useCase.desativar('inexistente')).rejects.toBeInstanceOf(
      ProdutoNaoEncontradoException,
    );
  });
});

describe('ListarProdutosUseCase', () => {
  let produtoRepository: jest.Mocked<ProdutoRepository>;
  let useCase: ListarProdutosUseCase;

  beforeEach(() => {
    produtoRepository = {
      listarTodos: jest.fn(),
      listarComFiltros: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorIds: jest.fn(),
      buscarPorSlug: jest.fn(),
      criar: jest.fn(),
      atualizar: jest.fn(),
    } as unknown as jest.Mocked<ProdutoRepository>;

    useCase = new ListarProdutosUseCase(produtoRepository);
  });

  it('transforma a query em filtros de listagem para paginação, busca e ordenação', async () => {
    const lista = {
      itens: [criarProduto()],
      total: 1,
      pagina: 2,
      limite: 20,
    };
    produtoRepository.listarComFiltros.mockResolvedValue(lista);

    const resultado = await useCase.executar({
      pagina: 2,
      limite: 20,
      busca: 'desinfetante',
      categoria: 'Limpeza',
      ativo: 'false',
      ordenarPor: 'preco',
      direcao: 'asc',
    } as any);

    expect(produtoRepository.listarComFiltros).toHaveBeenCalledWith({
      pagina: 2,
      limite: 20,
      busca: 'desinfetante',
      categoria: 'Limpeza',
      ativo: false,
      ordenarPor: 'preco',
      direcao: 'asc',
    });
    expect(resultado).toEqual(lista);
  });

  it('converte emPromocao de string pra boolean', async () => {
    produtoRepository.listarComFiltros.mockResolvedValue({
      itens: [],
      total: 0,
      pagina: 1,
      limite: 10,
    });

    await useCase.executar({ pagina: 1, limite: 10, emPromocao: 'true' } as any);

    expect(produtoRepository.listarComFiltros).toHaveBeenCalledWith(
      expect.objectContaining({ emPromocao: true }),
    );
  });
});

describe('ListarProdutosMaisVendidosUseCase', () => {
  it('repassa o limite pro repositório e devolve o resultado', async () => {
    const produtoRepository = {
      listarMaisVendidos: jest.fn().mockResolvedValue([criarProduto()]),
    } as unknown as jest.Mocked<ProdutoRepository>;
    const useCase = new ListarProdutosMaisVendidosUseCase(produtoRepository);

    const resultado = await useCase.executar(5);

    expect(produtoRepository.listarMaisVendidos).toHaveBeenCalledWith(5);
    expect(resultado).toHaveLength(1);
  });
});
