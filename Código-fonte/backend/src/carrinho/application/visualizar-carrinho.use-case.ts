import { Injectable } from '@nestjs/common';
import {
  ResolverCarrinhoSessaoUseCase,
  calcularExpiracao,
} from './resolver-carrinho-sessao.use-case';
import { ProdutoRepository } from '../../produtos/domain/produto.repository';
import { CupomRepository } from '../../cupons/domain/cupom.repository';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { ValidadorDeCupom } from '../../cupons/domain/validador-de-cupom';
import { DomainException } from '../../shared/exceptions/domain.exception';
import {
  CalcularDescontoAtacadoUseCase,
  ItemParaDescontoAtacado,
} from '../../atacado/application/calcular-desconto-atacado.use-case';

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
  /** 0 quando nenhuma regra de atacado se aplica a nenhum item do carrinho. */
  descontoAtacado: number;
  /** 0 quando nenhum cupom válido está aplicado. Só o desconto do cupom por
   * código — ver descontoAtacado pro desconto automático por quantidade. */
  desconto: number;
  /** total - descontoAtacado - desconto — o que o cliente paga de fato. */
  totalComDesconto: number;
  /** Só preenchido quando o cupom salvo no carrinho ainda passa em
   * ValidadorDeCupom. Um código salvo que deixou de valer é removido do carrinho
   * nesta mesma leitura (ver avisoCupom) — nunca fica "invisível mas ainda salvo". */
  cupomCodigo: string | undefined;
  /** Preenchido só nesta leitura em que um cupom salvo deixou de ser válido —
   * mensagem pronta pra UI explicar por que o desconto sumiu. undefined em
   * qualquer outra situação (nunca teve cupom, ou o cupom aplicado continua válido). */
  avisoCupom: string | undefined;
}

const VAZIO: ResultadoVisualizacaoCarrinho = {
  sessionToken: undefined,
  itens: [],
  itensIndisponiveis: [],
  total: 0,
  descontoAtacado: 0,
  desconto: 0,
  totalComDesconto: 0,
  cupomCodigo: undefined,
  avisoCupom: undefined,
};

/**
 * Leitura pura do carrinho — nunca cria uma linha no banco (ver
 * ResolverCarrinhoSessaoUseCase, chamado aqui com criarSeNaoExistir: false). Revalida
 * cada item contra o catálogo atual (preço, ativo, estoque) e o cupom aplicado
 * (ValidadorDeCupom) a cada chamada — nunca confia que o que foi válido na aplicação
 * continua válido agora (subtotal pode ter caído abaixo do mínimo, cupom pode ter
 * expirado/esgotado nesse meio tempo etc.).
 */
@Injectable()
export class VisualizarCarrinhoUseCase {
  constructor(
    private readonly resolverCarrinhoSessaoUseCase: ResolverCarrinhoSessaoUseCase,
    private readonly produtoRepository: ProdutoRepository,
    private readonly cupomRepository: CupomRepository,
    private readonly carrinhoSessaoRepository: CarrinhoSessaoRepository,
    private readonly calcularDescontoAtacadoUseCase: CalcularDescontoAtacadoUseCase,
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
    const itensParaAtacado: (ItemParaDescontoAtacado & { subtotal: number })[] = [];
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

      const precoUnitario = produto.precoEfetivo();
      const subtotal = Number((precoUnitario * item.quantidade).toFixed(2));
      itens.push({
        produtoId: produto.id,
        nome: produto.nome,
        quantidade: item.quantidade,
        precoUnitario,
        subtotal,
        disponivel: produto.estoque >= item.quantidade,
        estoqueDisponivel: produto.estoque,
      });
      itensParaAtacado.push({
        produtoId: produto.id,
        categoriaId: produto.categoriaId ?? undefined,
        quantidade: item.quantidade,
        precoUnitario,
        subtotal,
      });
    }

    const total = Number(itens.reduce((soma, item) => soma + item.subtotal, 0).toFixed(2));

    const descontosAtacadoPorItem =
      await this.calcularDescontoAtacadoUseCase.executar(itensParaAtacado);
    const descontoAtacado = Number(
      [...descontosAtacadoPorItem.values()].reduce((soma, valor) => soma + valor, 0).toFixed(2),
    );
    const subtotalCarrinho = Number((total - descontoAtacado).toFixed(2));

    let desconto = 0;
    let cupomCodigo: string | undefined;
    let avisoCupom: string | undefined;

    if (carrinho.cupomCodigo) {
      const cupom = await this.cupomRepository.buscarPorCodigo(carrinho.cupomCodigo);

      try {
        if (!cupom) {
          // Cupom foi excluído do catálogo depois de aplicado — mesmo tratamento
          // de "deixou de valer" que qualquer outra condição de ValidadorDeCupom.
          throw new Error('Cupom não existe mais.');
        }

        const itensElegiveis = itensParaAtacado.filter((item) =>
          cupom.ehElegivel(item.produtoId, item.categoriaId),
        );
        const subtotalElegivel = Number(
          itensElegiveis
            .reduce(
              (soma, item) =>
                soma + (item.subtotal - (descontosAtacadoPorItem.get(item.produtoId) ?? 0)),
              0,
            )
            .toFixed(2),
        );
        const usosClienteAtual = clienteId
          ? await this.cupomRepository.contarUsosCliente(cupom.codigo, clienteId)
          : 0;

        ValidadorDeCupom.validar(cupom, {
          subtotalCarrinho,
          temItemElegivel: itensElegiveis.length > 0,
          usosClienteAtual,
        });

        desconto = cupom.calcularDesconto(subtotalElegivel);
        cupomCodigo = cupom.codigo;
      } catch (erro) {
        // Cupom salvo deixou de valer — remove do carrinho persistido (não fica
        // "invisível mas ainda lá" pra próxima leitura repetir o mesmo trabalho) e
        // devolve o motivo pra UI explicar a mudança, em vez de só sumir com o desconto.
        avisoCupom = erro instanceof DomainException ? erro.message : 'Cupom não é mais válido.';
        await this.carrinhoSessaoRepository.definirCupom(carrinho.id, null, calcularExpiracao());
      }
    }

    return {
      sessionToken: carrinho.sessionToken,
      itens,
      itensIndisponiveis,
      total,
      descontoAtacado,
      desconto,
      totalComDesconto: Number((total - descontoAtacado - desconto).toFixed(2)),
      cupomCodigo,
      avisoCupom,
    };
  }
}
