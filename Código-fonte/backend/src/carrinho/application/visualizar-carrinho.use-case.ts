import { Injectable } from '@nestjs/common';
import { ResolverCarrinhoSessaoUseCase } from './resolver-carrinho-sessao.use-case';
import { ProdutoRepository } from '../../produtos/domain/produto.repository';
import { CupomRepository } from '../../cupons/domain/cupom.repository';

export interface ItemCarrinhoVisualizado {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  disponivel: boolean;
  estoqueDisponivel: number;
}

export type MotivoIndisponibilidadeCarrinho = 'PRODUTO_INDISPONIVEL' | 'SEM_ESTOQUE';

export interface ItemCarrinhoIndisponivel {
  produtoId: string;
  /** undefined só quando o produto sumiu de vez do catálogo (nem o registro existe
   * mais) — inativo ou sem estoque ainda tem nome pra mostrar na UI. */
  nome: string | undefined;
  motivo: MotivoIndisponibilidadeCarrinho;
}

export interface ResultadoVisualizacaoCarrinho {
  /** undefined quando nada foi persistido ainda (nunca criamos carrinho só de ler). */
  sessionToken: string | undefined;
  itens: ItemCarrinhoVisualizado[];
  itensIndisponiveis: ItemCarrinhoIndisponivel[];
  total: number;
  /** 0 quando nenhum cupom válido está aplicado. */
  desconto: number;
  totalComDesconto: number;
  /** Só preenchido quando o cupom salvo no carrinho ainda é válido — ver
   * Cupom.estaValido(). Um código salvo mas expirado/esgotado some daqui (sem
   * limpar o campo no banco, só não aplica desconto). */
  cupomCodigo: string | undefined;
}

const VAZIO: ResultadoVisualizacaoCarrinho = {
  sessionToken: undefined,
  itens: [],
  itensIndisponiveis: [],
  total: 0,
  desconto: 0,
  totalComDesconto: 0,
  cupomCodigo: undefined,
};

/**
 * Leitura pura do carrinho — nunca cria uma linha no banco (ver
 * ResolverCarrinhoSessaoUseCase, chamado aqui com criarSeNaoExistir: false). Revalida
 * cada item contra o catálogo atual (preço, ativo, estoque), igual MontarCarrinhoUseCase,
 * mas nunca lança: item problemático vai pra itensIndisponiveis, o resto segue normal.
 */
@Injectable()
export class VisualizarCarrinhoUseCase {
  constructor(
    private readonly resolverCarrinhoSessaoUseCase: ResolverCarrinhoSessaoUseCase,
    private readonly produtoRepository: ProdutoRepository,
    private readonly cupomRepository: CupomRepository,
  ) {}

  async executar(
    sessionToken: string | undefined,
    clienteId: string | undefined,
  ): Promise<ResultadoVisualizacaoCarrinho> {
    const { carrinho } = await this.resolverCarrinhoSessaoUseCase.executar(
      sessionToken,
      clienteId,
      false,
    );

    if (!carrinho || carrinho.itens.length === 0) {
      return carrinho ? { ...VAZIO, sessionToken: carrinho.sessionToken } : VAZIO;
    }

    const produtoIds = carrinho.itens.map((item) => item.produtoId);
    const produtos = await this.produtoRepository.buscarPorIds(produtoIds);
    const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]));

    const itens: ItemCarrinhoVisualizado[] = [];
    const itensIndisponiveis: ItemCarrinhoIndisponivel[] = [];

    for (const item of carrinho.itens) {
      const produto = produtosPorId.get(item.produtoId);

      if (!produto || !produto.ativo) {
        itensIndisponiveis.push({
          produtoId: item.produtoId,
          nome: produto?.nome,
          motivo: 'PRODUTO_INDISPONIVEL',
        });
        continue;
      }
      if (produto.estoque <= 0) {
        itensIndisponiveis.push({
          produtoId: item.produtoId,
          nome: produto.nome,
          motivo: 'SEM_ESTOQUE',
        });
        continue;
      }

      const subtotal = Number((produto.preco * item.quantidade).toFixed(2));
      itens.push({
        produtoId: produto.id,
        nome: produto.nome,
        quantidade: item.quantidade,
        precoUnitario: produto.preco,
        subtotal,
        disponivel: produto.estoque >= item.quantidade,
        estoqueDisponivel: produto.estoque,
      });
    }

    const total = Number(itens.reduce((soma, item) => soma + item.subtotal, 0).toFixed(2));

    let desconto = 0;
    let cupomCodigo: string | undefined;
    if (carrinho.cupomCodigo) {
      const cupom = await this.cupomRepository.buscarPorCodigo(carrinho.cupomCodigo);
      if (cupom && cupom.estaValido()) {
        desconto = cupom.calcularDesconto(total);
        cupomCodigo = cupom.codigo;
      }
    }

    return {
      sessionToken: carrinho.sessionToken,
      itens,
      itensIndisponiveis,
      total,
      desconto,
      totalComDesconto: Number((total - desconto).toFixed(2)),
      cupomCodigo,
    };
  }
}
