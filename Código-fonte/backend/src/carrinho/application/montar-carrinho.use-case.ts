import { Injectable } from '@nestjs/common';
import { ProdutoRepository } from '../../produtos/domain/produto.repository';
import { ProdutoNaoEncontradoException } from '../../produtos/domain/produtos.exceptions';
import { CupomRepository } from '../../cupons/domain/cupom.repository';
import { CupomCodigoInvalidoException } from '../../cupons/domain/cupons.exceptions';
import { ValidadorDeCupom } from '../../cupons/domain/validador-de-cupom';
import { CalcularDescontoAtacadoUseCase } from '../../atacado/application/calcular-desconto-atacado.use-case';
import { Carrinho, ItemPrecificado } from '../domain/item-precificado';
import { CarrinhoItemSolicitado } from '../domain/carrinho-item-solicitado';
import {
  CarrinhoVazioException,
  EstoqueInsuficienteException,
} from '../domain/carrinho.exceptions';

/**
 * Valida os itens pedidos contra o catálogo de produtos (existência e estoque)
 * e monta um Carrinho com preços atuais. Usado tanto pela pré-visualização do
 * carrinho quanto pela criação de pedidos, para nunca confiar em preço vindo do cliente.
 */
@Injectable()
export class MontarCarrinhoUseCase {
  constructor(
    private readonly produtoRepository: ProdutoRepository,
    private readonly cupomRepository: CupomRepository,
    private readonly calcularDescontoAtacadoUseCase: CalcularDescontoAtacadoUseCase,
  ) {}

  async executar(
    itensSolicitados: CarrinhoItemSolicitado[],
    cupomCodigo?: string,
    /** undefined pra carrinho anônimo — limiteUsoPorCliente nunca se aplica nesse caso. */
    clienteId?: string,
  ): Promise<Carrinho> {
    if (!itensSolicitados.length) {
      throw new CarrinhoVazioException();
    }

    // Consolida quantidades do mesmo produto antes de validar estoque — senão o
    // mesmo produtoId repetido em duas linhas passaria na checagem de estoque
    // duas vezes de forma isolada (5 em estoque, duas linhas de 3 cada "cabem"
    // individualmente, mas juntas excedem o disponível).
    const quantidadePorProduto = new Map<string, number>();
    for (const item of itensSolicitados) {
      quantidadePorProduto.set(
        item.produtoId,
        (quantidadePorProduto.get(item.produtoId) ?? 0) + item.quantidade,
      );
    }

    const produtos = await this.produtoRepository.buscarPorIds([...quantidadePorProduto.keys()]);
    const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));

    const itensValidados = [...quantidadePorProduto.entries()].map(([produtoId, quantidade]) => {
      const produto = produtosPorId.get(produtoId);
      if (!produto) {
        throw new ProdutoNaoEncontradoException(produtoId);
      }
      if (!produto.possuiEstoqueDisponivel(quantidade)) {
        throw new EstoqueInsuficienteException(produto.nome);
      }
      return { produto, quantidade };
    });

    // Atacado é calculado ANTES do cupom por código e nunca depende dele — é
    // política de preço do produto, independente de promoção digitada (ver decisão
    // documentada em RegraAtacado). O desconto de cupom, mais abaixo, incide sobre
    // o subtotal já líquido de atacado: os dois se SOMAM, nunca competem.
    const descontosAtacado = await this.calcularDescontoAtacadoUseCase.executar(
      itensValidados.map(({ produto, quantidade }) => ({
        produtoId: produto.id,
        categoriaId: produto.categoriaId ?? undefined,
        quantidade,
        precoUnitario: produto.precoEfetivo(),
      })),
    );

    const itens = itensValidados.map(
      ({ produto, quantidade }) =>
        new ItemPrecificado(
          produto.id,
          produto.nome,
          quantidade,
          produto.precoEfetivo(),
          produto.pesoKg,
          produto.alturaCm,
          produto.larguraCm,
          produto.comprimentoCm,
          produto.categoriaId ?? undefined,
          descontosAtacado.get(produto.id) ?? 0,
        ),
    );

    const carrinhoSemCupom = new Carrinho(itens);
    if (!cupomCodigo) {
      return carrinhoSemCupom;
    }

    // CriarCupomUseCase sempre normaliza o código pra maiúsculo antes de gravar —
    // normaliza aqui também, senão um cliente digitando minúsculo nunca acharia
    // um cupom que existe.
    const cupom = await this.cupomRepository.buscarPorCodigo(cupomCodigo.toUpperCase());
    if (!cupom) {
      throw new CupomCodigoInvalidoException(cupomCodigo);
    }

    const itensElegiveis = itens.filter((item) =>
      cupom.ehElegivel(item.produtoId, item.categoriaId),
    );
    const subtotalElegivel = Number(
      itensElegiveis.reduce((soma, item) => soma + item.subtotalLiquidoAtacado, 0).toFixed(2),
    );
    // Valor mínimo do pedido olha pro carrinho INTEIRO (já líquido de atacado),
    // não só a parte elegível ao cupom — ver ValidadorDeCupom/ContextoValidacaoCupom.
    const subtotalCarrinho = Number(
      (carrinhoSemCupom.total - carrinhoSemCupom.descontoAtacado).toFixed(2),
    );

    const usosClienteAtual = clienteId
      ? await this.cupomRepository.contarUsosCliente(cupom.codigo, clienteId)
      : 0;

    ValidadorDeCupom.validar(cupom, {
      subtotalCarrinho,
      temItemElegivel: itensElegiveis.length > 0,
      usosClienteAtual,
    });

    const desconto = cupom.calcularDesconto(subtotalElegivel);
    return new Carrinho(itens, desconto, cupom.codigo);
  }
}
