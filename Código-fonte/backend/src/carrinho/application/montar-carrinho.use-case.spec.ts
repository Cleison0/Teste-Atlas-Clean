// Testes do MontarCarrinhoUseCase: validação de itens solicitados contra o catálogo
// (existência e estoque) e cálculo de preços/total a partir do produto, nunca do cliente.
import { MontarCarrinhoUseCase } from './montar-carrinho.use-case';
import { ProdutoRepository } from '../../produtos/domain/produto.repository';
import { ProdutoNaoEncontradoException } from '../../produtos/domain/produtos.exceptions';
import { Produto } from '../../produtos/domain/produto.entity';
import { CupomRepository } from '../../cupons/domain/cupom.repository';
import { Cupom } from '../../cupons/domain/cupom.entity';
import {
  CupomCodigoInvalidoException,
  CupomEsgotadoException,
  CupomExpiradoException,
  CupomInativoException,
  CupomLimiteUsoClienteExcedidoException,
  CupomNaoAplicavelItensException,
  CupomValorMinimoNaoAtingidoException,
} from '../../cupons/domain/cupons.exceptions';
import { CalcularDescontoAtacadoUseCase } from '../../atacado/application/calcular-desconto-atacado.use-case';
import {
  CarrinhoVazioException,
  EstoqueInsuficienteException,
} from '../domain/carrinho.exceptions';

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

describe('MontarCarrinhoUseCase', () => {
  let produtoRepository: jest.Mocked<ProdutoRepository>;
  let cupomRepository: jest.Mocked<CupomRepository>;
  let calcularDescontoAtacadoUseCase: jest.Mocked<CalcularDescontoAtacadoUseCase>;
  let useCase: MontarCarrinhoUseCase;

  beforeEach(() => {
    produtoRepository = {
      listarTodos: jest.fn(),
      buscarPorId: jest.fn(),
      buscarPorIds: jest.fn(),
      decrementarEstoque: jest.fn(),
    } as unknown as jest.Mocked<ProdutoRepository>;

    cupomRepository = {
      buscarPorCodigo: jest.fn(),
      contarUsosCliente: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<CupomRepository>;

    calcularDescontoAtacadoUseCase = {
      executar: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<CalcularDescontoAtacadoUseCase>;

    useCase = new MontarCarrinhoUseCase(
      produtoRepository,
      cupomRepository,
      calcularDescontoAtacadoUseCase,
    );
  });

  it('lança CarrinhoVazioException quando não há itens solicitados', async () => {
    await expect(useCase.executar([])).rejects.toBeInstanceOf(CarrinhoVazioException);
    expect(produtoRepository.buscarPorIds).not.toHaveBeenCalled();
  });

  it('lança ProdutoNaoEncontradoException quando um produto solicitado não existe no catálogo', async () => {
    produtoRepository.buscarPorIds.mockResolvedValue([]);

    await expect(
      useCase.executar([{ produtoId: 'inexistente', quantidade: 1 }]),
    ).rejects.toBeInstanceOf(ProdutoNaoEncontradoException);
  });

  it('lança EstoqueInsuficienteException quando a quantidade pedida excede o estoque', async () => {
    produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ estoque: 2 })]);

    await expect(
      useCase.executar([{ produtoId: 'produto-1', quantidade: 3 }]),
    ).rejects.toBeInstanceOf(EstoqueInsuficienteException);
  });

  it('monta o carrinho com preço vindo do catálogo, ignorando qualquer preço do cliente', async () => {
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ id: 'produto-1', nome: 'Detergente', preco: 10, estoque: 5 }),
      criarProduto({ id: 'produto-2', nome: 'Sabão em pó', preco: 25.9, estoque: 5 }),
    ]);

    const carrinho = await useCase.executar([
      { produtoId: 'produto-1', quantidade: 2 },
      { produtoId: 'produto-2', quantidade: 1 },
    ]);

    expect(carrinho.itens).toHaveLength(2);
    expect(carrinho.itens[0]).toMatchObject({
      produtoId: 'produto-1',
      quantidade: 2,
      precoUnitario: 10,
    });
    expect(carrinho.total).toBe(45.9);
  });

  it('usa o preço promocional (não o normal) quando o produto está em promoção', async () => {
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ id: 'produto-1', preco: 10, precoPromocional: 7, estoque: 5 }),
    ]);

    const carrinho = await useCase.executar([{ produtoId: 'produto-1', quantidade: 2 }]);

    expect(carrinho.itens[0].precoUnitario).toBe(7);
    expect(carrinho.total).toBe(14);
  });

  it('consolida quantidades do mesmo produto pedido em mais de uma linha', async () => {
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ id: 'produto-1', nome: 'Detergente', preco: 10, estoque: 5 }),
    ]);

    const carrinho = await useCase.executar([
      { produtoId: 'produto-1', quantidade: 2 },
      { produtoId: 'produto-1', quantidade: 2 },
    ]);

    // buscarPorIds só deve ser chamado com o id deduplicado, não duas vezes.
    expect(produtoRepository.buscarPorIds).toHaveBeenCalledWith(['produto-1']);
    expect(carrinho.itens).toHaveLength(1);
    expect(carrinho.itens[0]).toMatchObject({ produtoId: 'produto-1', quantidade: 4 });
    expect(carrinho.total).toBe(40);
  });

  it('lança EstoqueInsuficienteException quando o mesmo produto em duas linhas excede o estoque somado', async () => {
    // Estoque 5: cada linha isolada (3) "caberia", mas juntas (6) excedem.
    // Sem consolidar antes de validar, esse caso passaria pela checagem por engano.
    produtoRepository.buscarPorIds.mockResolvedValue([
      criarProduto({ id: 'produto-1', nome: 'Detergente', estoque: 5 }),
    ]);

    await expect(
      useCase.executar([
        { produtoId: 'produto-1', quantidade: 3 },
        { produtoId: 'produto-1', quantidade: 3 },
      ]),
    ).rejects.toBeInstanceOf(EstoqueInsuficienteException);
  });

  describe('atacado', () => {
    it('desconto de atacado é passado adiante pra CalcularDescontoAtacadoUseCase e refletido no item/carrinho', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([
        criarProduto({ id: 'produto-1', preco: 10, estoque: 20 }),
      ]);
      calcularDescontoAtacadoUseCase.executar.mockResolvedValue(new Map([['produto-1', 12]]));

      const carrinho = await useCase.executar([{ produtoId: 'produto-1', quantidade: 12 }]);

      expect(carrinho.itens[0].descontoAtacado).toBe(12);
      expect(carrinho.descontoAtacado).toBe(12);
      expect(carrinho.total).toBe(120);
    });
  });

  describe('cupom', () => {
    it('sem cupomCodigo, desconto fica 0 e cupomCodigo undefined', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);

      const carrinho = await useCase.executar([{ produtoId: 'produto-1', quantidade: 2 }]);

      expect(carrinho.desconto).toBe(0);
      expect(carrinho.cupomCodigo).toBeUndefined();
      expect(cupomRepository.buscarPorCodigo).not.toHaveBeenCalled();
    });

    it('aplica cupom PERCENTUAL válido sobre o total dos itens', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(
        criarCupom({ codigo: 'DESCONTO10', tipoDesconto: 'PERCENTUAL', valor: 10 }),
      );

      const carrinho = await useCase.executar(
        [{ produtoId: 'produto-1', quantidade: 2 }],
        'DESCONTO10',
      );

      expect(carrinho.total).toBe(20);
      expect(carrinho.desconto).toBe(2);
      expect(carrinho.cupomCodigo).toBe('DESCONTO10');
    });

    it('cupom VALOR_FIXO maior que o total nunca deixa o desconto passar do total', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(
        criarCupom({ codigo: 'FRETE50', tipoDesconto: 'VALOR_FIXO', valor: 50 }),
      );

      const carrinho = await useCase.executar(
        [{ produtoId: 'produto-1', quantidade: 1 }],
        'FRETE50',
      );

      expect(carrinho.total).toBe(10);
      expect(carrinho.desconto).toBe(10);
    });

    it('atacado e cupom se somam: cupom incide sobre o subtotal já líquido de atacado', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10, estoque: 20 })]);
      calcularDescontoAtacadoUseCase.executar.mockResolvedValue(new Map([['produto-1', 20]])); // 12 un. -> 120 - 20 = 100
      cupomRepository.buscarPorCodigo.mockResolvedValue(
        criarCupom({ tipoDesconto: 'PERCENTUAL', valor: 10 }),
      );

      const carrinho = await useCase.executar(
        [{ produtoId: 'produto-1', quantidade: 12 }],
        'DESCONTO10',
      );

      expect(carrinho.total).toBe(120);
      expect(carrinho.descontoAtacado).toBe(20);
      expect(carrinho.desconto).toBe(10); // 10% de 100 (120 - 20), não de 120
      expect(carrinho.descontoTotal).toBe(30);
    });

    it('lança CupomCodigoInvalidoException quando o código não existe', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(null);

      await expect(
        useCase.executar([{ produtoId: 'produto-1', quantidade: 1 }], 'INEXISTENTE'),
      ).rejects.toBeInstanceOf(CupomCodigoInvalidoException);
    });

    it('lança CupomInativoException quando o cupom está inativo', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom({ ativo: false }));

      await expect(
        useCase.executar([{ produtoId: 'produto-1', quantidade: 1 }], 'DESCONTO10'),
      ).rejects.toBeInstanceOf(CupomInativoException);
    });

    it('lança CupomExpiradoException quando o cupom expirou', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(
        criarCupom({ validoAte: new Date('2020-01-01') }),
      );

      await expect(
        useCase.executar([{ produtoId: 'produto-1', quantidade: 1 }], 'DESCONTO10'),
      ).rejects.toBeInstanceOf(CupomExpiradoException);
    });

    it('lança CupomEsgotadoException quando o cupom já atingiu o usoMaximo', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom({ usoMaximo: 5, usosCount: 5 }));

      await expect(
        useCase.executar([{ produtoId: 'produto-1', quantidade: 1 }], 'DESCONTO10'),
      ).rejects.toBeInstanceOf(CupomEsgotadoException);
    });

    it('lança CupomValorMinimoNaoAtingidoException quando o subtotal fica abaixo do mínimo exigido', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom({ valorMinimoPedido: 50 }));

      await expect(
        useCase.executar([{ produtoId: 'produto-1', quantidade: 2 }], 'DESCONTO10'),
      ).rejects.toBeInstanceOf(CupomValorMinimoNaoAtingidoException);
    });

    it('aplica normalmente quando o subtotal atinge exatamente o valor mínimo', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom({ valorMinimoPedido: 20 }));

      const carrinho = await useCase.executar(
        [{ produtoId: 'produto-1', quantidade: 2 }],
        'DESCONTO10',
      );
      expect(carrinho.cupomCodigo).toBe('DESCONTO10');
    });

    it('lança CupomNaoAplicavelItensException quando o carrinho não tem nenhum item elegível (restrição por produto)', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([
        criarProduto({ id: 'produto-1', preco: 10 }),
      ]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(
        criarCupom({ produtosRestritos: ['produto-outro'] }),
      );

      await expect(
        useCase.executar([{ produtoId: 'produto-1', quantidade: 1 }], 'DESCONTO10'),
      ).rejects.toBeInstanceOf(CupomNaoAplicavelItensException);
    });

    it('com restrição por categoria, desconta só o subtotal dos itens da categoria elegível', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([
        criarProduto({ id: 'produto-1', preco: 10, categoriaId: 'cat-limpeza' }),
        criarProduto({ id: 'produto-2', preco: 20, categoriaId: 'cat-papelaria' }),
      ]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(
        criarCupom({ tipoDesconto: 'PERCENTUAL', valor: 10, categoriasRestritas: ['cat-limpeza'] }),
      );

      const carrinho = await useCase.executar(
        [
          { produtoId: 'produto-1', quantidade: 1 },
          { produtoId: 'produto-2', quantidade: 1 },
        ],
        'DESCONTO10',
      );

      // 10% só sobre os 10 do produto-1 (cat-limpeza) — não sobre os 30 do carrinho todo.
      expect(carrinho.desconto).toBe(1);
    });

    it('lança CupomLimiteUsoClienteExcedidoException quando o cliente já usou o cupom o máximo permitido', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom({ limiteUsoPorCliente: 1 }));
      cupomRepository.contarUsosCliente.mockResolvedValue(1);

      await expect(
        useCase.executar([{ produtoId: 'produto-1', quantidade: 1 }], 'DESCONTO10', 'cliente-1'),
      ).rejects.toBeInstanceOf(CupomLimiteUsoClienteExcedidoException);
      expect(cupomRepository.contarUsosCliente).toHaveBeenCalledWith('DESCONTO10', 'cliente-1');
    });

    it('não verifica limiteUsoPorCliente pra carrinho anônimo (sem clienteId)', async () => {
      produtoRepository.buscarPorIds.mockResolvedValue([criarProduto({ preco: 10 })]);
      cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom({ limiteUsoPorCliente: 1 }));

      const carrinho = await useCase.executar(
        [{ produtoId: 'produto-1', quantidade: 1 }],
        'DESCONTO10',
      );

      expect(carrinho.cupomCodigo).toBe('DESCONTO10');
      expect(cupomRepository.contarUsosCliente).not.toHaveBeenCalled();
    });
  });
});
