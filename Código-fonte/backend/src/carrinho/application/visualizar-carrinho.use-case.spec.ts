// Testes da leitura revalidada do carrinho: nunca cria carrinho (só leitura), e
// classifica cada item persistido contra o catálogo atual — disponível (com estoque
// parcial sinalizado, não removido), ou indisponível (produto sumido/inativo/zerado).
import { VisualizarCarrinhoUseCase } from './visualizar-carrinho.use-case';
import { ResolverCarrinhoSessaoUseCase } from './resolver-carrinho-sessao.use-case';
import { ProdutoRepository } from '../../produtos/domain/produto.repository';
import { Produto } from '../../produtos/domain/produto.entity';
import { CarrinhoSessao, ItemCarrinhoSessao } from '../domain/carrinho-sessao';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { CupomRepository } from '../../cupons/domain/cupom.repository';
import { Cupom } from '../../cupons/domain/cupom.entity';
import { CalcularDescontoAtacadoUseCase } from '../../atacado/application/calcular-desconto-atacado.use-case';

function criarCupom(overrides: Partial<Cupom> = {}): Cupom {
  return new Cupom(
    overrides.id ?? 'cupom-1',
    overrides.codigo ?? 'DESCONTO10',
    overrides.tipoDesconto ?? 'PERCENTUAL',
    overrides.valor ?? 10,
    overrides.ativo ?? true,
    overrides.usosCount ?? 0,
    overrides.createdAt ?? new Date(),
    overrides.validoAte,
    overrides.usoMaximo,
    overrides.valorMinimoPedido,
    overrides.limiteUsoPorCliente,
    overrides.categoriasRestritas ?? [],
    overrides.produtosRestritos ?? [],
  );
}

function criarProduto(overrides: Partial<Produto> = {}): Produto {
  return new Produto(
    overrides.id ?? 'produto-1',
    overrides.nome ?? 'Detergente',
    overrides.slug ?? 'detergente',
    overrides.preco ?? 10,
    overrides.estoque ?? 5,
    overrides.ativo ?? true,
    overrides.descricao,
    overrides.categoria,
    overrides.createdAt,
    overrides.updatedAt,
    overrides.pesoKg,
    overrides.alturaCm,
    overrides.larguraCm,
    overrides.comprimentoCm,
    overrides.pack,
    overrides.marca,
    overrides.produtoTipo,
    overrides.precoPromocional,
    overrides.categoriaId,
  );
}

describe('VisualizarCarrinhoUseCase', () => {
  let resolverCarrinhoSessaoUseCase: jest.Mocked<ResolverCarrinhoSessaoUseCase>;
  let produtoRepository: jest.Mocked<ProdutoRepository>;
  let cupomRepository: jest.Mocked<CupomRepository>;
  let carrinhoSessaoRepository: jest.Mocked<CarrinhoSessaoRepository>;
  let calcularDescontoAtacadoUseCase: jest.Mocked<CalcularDescontoAtacadoUseCase>;
  let useCase: VisualizarCarrinhoUseCase;

  beforeEach(() => {
    resolverCarrinhoSessaoUseCase = {
      executar: jest.fn(),
    } as unknown as jest.Mocked<ResolverCarrinhoSessaoUseCase>;

    produtoRepository = {
      buscarPorIds: jest.fn(),
    } as unknown as jest.Mocked<ProdutoRepository>;

    cupomRepository = {
      buscarPorCodigo: jest.fn(),
      contarUsosCliente: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<CupomRepository>;

    carrinhoSessaoRepository = {
      definirCupom: jest.fn(),
    } as unknown as jest.Mocked<CarrinhoSessaoRepository>;

    calcularDescontoAtacadoUseCase = {
      executar: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<CalcularDescontoAtacadoUseCase>;

    useCase = new VisualizarCarrinhoUseCase(
      resolverCarrinhoSessaoUseCase,
      produtoRepository,
      cupomRepository,
      carrinhoSessaoRepository,
      calcularDescontoAtacadoUseCase,
    );
  });

  it('devolve carrinho vazio sem tocar o repositório de produtos quando nada é encontrado', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: undefined,
      sessionTokenNovo: undefined,
    });

    const resultado = await useCase.executar(undefined, undefined);

    expect(resultado).toEqual({
      sessionToken: undefined,
      itens: [],
      itensIndisponiveis: [],
      total: 0,
      descontoAtacado: 0,
      desconto: 0,
      totalComDesconto: 0,
      cupomCodigo: undefined,
      avisoCupom: undefined,
    });
    expect(produtoRepository.buscarPorIds).not.toHaveBeenCalled();
    expect(resolverCarrinhoSessaoUseCase.executar).toHaveBeenCalledWith(
      undefined,
      undefined,
      false,
    );
  });

  it('resolve com criarSeNaoExistir: false — leitura nunca cria carrinho', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: undefined,
      sessionTokenNovo: undefined,
    });

    await useCase.executar('token-1', 'cliente-1');

    expect(resolverCarrinhoSessaoUseCase.executar).toHaveBeenCalledWith(
      'token-1',
      'cliente-1',
      false,
    );
  });

  it('marca item de produto inativo como PRODUTO_INDISPONIVEL, sem remover do carrinho', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
        new ItemCarrinhoSessao('produto-1', 2),
      ]),
      sessionTokenNovo: undefined,
    });
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ nome: 'Detergente', ativo: false }),
    ]);

    const resultado = await useCase.executar('token-1', undefined);

    expect(resultado.itens).toHaveLength(0);
    expect(resultado.itensIndisponiveis).toEqual([
      { produtoId: 'produto-1', nome: 'Detergente', motivo: 'PRODUTO_INDISPONIVEL' },
    ]);
  });

  it('marca item de produto sem estoque como SEM_ESTOQUE', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
        new ItemCarrinhoSessao('produto-1', 2),
      ]),
      sessionTokenNovo: undefined,
    });
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ nome: 'Detergente', estoque: 0 }),
    ]);

    const resultado = await useCase.executar('token-1', undefined);

    expect(resultado.itensIndisponiveis).toEqual([
      { produtoId: 'produto-1', nome: 'Detergente', motivo: 'SEM_ESTOQUE' },
    ]);
  });

  it('produto removido do catálogo (id não encontrado) também vira PRODUTO_INDISPONIVEL', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
        new ItemCarrinhoSessao('produto-removido', 1),
      ]),
      sessionTokenNovo: undefined,
    });
    produtoRepository.buscarPorIds.mockResolvedValue([]);

    const resultado = await useCase.executar('token-1', undefined);

    expect(resultado.itensIndisponiveis).toEqual([
      { produtoId: 'produto-removido', nome: undefined, motivo: 'PRODUTO_INDISPONIVEL' },
    ]);
  });

  it('estoque parcial continua em itens (disponivel:true) com estoqueDisponivel correto, não vai pra itensIndisponiveis', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
        new ItemCarrinhoSessao('produto-1', 5),
      ]),
      sessionTokenNovo: undefined,
    });
    produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ estoque: 2 })]);

    const resultado = await useCase.executar('token-1', undefined);

    expect(resultado.itensIndisponiveis).toEqual([]);
    expect(resultado.itens).toEqual([
      expect.objectContaining({
        produtoId: 'produto-1',
        quantidade: 5,
        disponivel: false,
        estoqueDisponivel: 2,
      }),
    ]);
  });

  it('calcula subtotal/total só a partir do preço atual do catálogo, ignorando qualquer coisa salva no item', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
        new ItemCarrinhoSessao('produto-1', 2),
        new ItemCarrinhoSessao('produto-2', 1),
      ]),
      sessionTokenNovo: undefined,
    });
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ id: 'produto-1', preco: 10, estoque: 5 }),
      criarProduto({ id: 'produto-2', preco: 25.9, estoque: 5 }),
    ]);

    const resultado = await useCase.executar('token-1', undefined);

    expect(resultado.itens[0].subtotal).toBe(20);
    expect(resultado.total).toBe(45.9);
  });

  it('usa o preço promocional (não o normal) quando o produto está em promoção', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
        new ItemCarrinhoSessao('produto-1', 2),
      ]),
      sessionTokenNovo: undefined,
    });
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ id: 'produto-1', preco: 10, precoPromocional: 7, estoque: 5 }),
    ]);

    const resultado = await useCase.executar('token-1', undefined);

    expect(resultado.itens[0].precoUnitario).toBe(7);
    expect(resultado.itens[0].subtotal).toBe(14);
    expect(resultado.total).toBe(14);
  });

  it('total soma só itens disponíveis, ignorando os indisponíveis', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
        new ItemCarrinhoSessao('produto-1', 2),
        new ItemCarrinhoSessao('produto-2', 1),
      ]),
      sessionTokenNovo: undefined,
    });
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ id: 'produto-1', preco: 10, estoque: 5 }),
      criarProduto({ id: 'produto-2', preco: 25.9, ativo: false }),
    ]);

    const resultado = await useCase.executar('token-1', undefined);

    expect(resultado.total).toBe(20);
  });

  it('repassa o sessionToken do carrinho resolvido na resposta', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-existente', undefined, []),
      sessionTokenNovo: undefined,
    });

    const resultado = await useCase.executar('token-existente', undefined);

    expect(resultado.sessionToken).toBe('token-existente');
  });

  describe('atacado', () => {
    it('desconto de atacado aparece separado do desconto de cupom e reduz totalComDesconto', async () => {
      resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
        carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
          new ItemCarrinhoSessao('produto-1', 12),
        ]),
        sessionTokenNovo: undefined,
      });
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10, estoque: 20 })]);
      calcularDescontoAtacadoUseCase.executar.mockResolvedValue(new Map([['produto-1', 20]]));

      const resultado = await useCase.executar('token-1', undefined);

      expect(resultado.total).toBe(120);
      expect(resultado.descontoAtacado).toBe(20);
      expect(resultado.totalComDesconto).toBe(100);
    });
  });

  describe('cupom', () => {
    it('aplica desconto do cupom salvo no carrinho, se ainda for válido', async () => {
      resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
        carrinho: new CarrinhoSessao(
          'carrinho-1',
          'token-1',
          undefined,
          [new ItemCarrinhoSessao('produto-1', 2)],
          undefined,
          'DESCONTO10',
        ),
        sessionTokenNovo: undefined,
      });
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom());

      const resultado = await useCase.executar('token-1', undefined);

      expect(resultado.total).toBe(20);
      expect(resultado.desconto).toBe(2);
      expect(resultado.totalComDesconto).toBe(18);
      expect(resultado.cupomCodigo).toBe('DESCONTO10');
      expect(resultado.avisoCupom).toBeUndefined();
      expect(carrinhoSessaoRepository.definirCupom).not.toHaveBeenCalled();
    });

    it('cupom salvo mas expirado é removido do carrinho e devolve avisoCupom com o motivo', async () => {
      resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
        carrinho: new CarrinhoSessao(
          'carrinho-1',
          'token-1',
          undefined,
          [new ItemCarrinhoSessao('produto-1', 2)],
          undefined,
          'DESCONTO10',
        ),
        sessionTokenNovo: undefined,
      });
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(
        criarCupom({ validoAte: new Date('2020-01-01') }),
      );

      const resultado = await useCase.executar('token-1', undefined);

      expect(resultado.desconto).toBe(0);
      expect(resultado.totalComDesconto).toBe(20);
      expect(resultado.cupomCodigo).toBeUndefined();
      expect(resultado.avisoCupom).toContain('expirou');
      expect(carrinhoSessaoRepository.definirCupom).toHaveBeenCalledWith(
        'carrinho-1',
        null,
        expect.any(Date),
      );
    });

    it('cupom salvo mas abaixo do valor mínimo (item removido baixou o subtotal) é removido com aviso específico', async () => {
      resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
        carrinho: new CarrinhoSessao(
          'carrinho-1',
          'token-1',
          undefined,
          [new ItemCarrinhoSessao('produto-1', 1)],
          undefined,
          'DESCONTO10',
        ),
        sessionTokenNovo: undefined,
      });
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom({ valorMinimoPedido: 50 }));

      const resultado = await useCase.executar('token-1', undefined);

      expect(resultado.cupomCodigo).toBeUndefined();
      expect(resultado.avisoCupom).toContain('50');
      expect(carrinhoSessaoRepository.definirCupom).toHaveBeenCalled();
    });

    it('sem cupom salvo, desconto fica 0 sem consultar CupomRepository', async () => {
      resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
        carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
          new ItemCarrinhoSessao('produto-1', 2),
        ]),
        sessionTokenNovo: undefined,
      });
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);

      const resultado = await useCase.executar('token-1', undefined);

      expect(resultado.desconto).toBe(0);
      expect(cupomRepository.buscarPorCodigo).not.toHaveBeenCalled();
    });
  });
});
