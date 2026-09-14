import { Cupom } from './cupom.entity';
import {
  CupomEsgotadoException,
  CupomExpiradoException,
  CupomInativoException,
  CupomLimiteUsoClienteExcedidoException,
  CupomNaoAplicavelItensException,
  CupomValorMinimoNaoAtingidoException,
} from './cupons.exceptions';

export interface ContextoValidacaoCupom {
  /** Subtotal de TODO o carrinho (já líquido de desconto de atacado, se houver —
   * ver MontarCarrinhoUseCase), usado contra `valorMinimoPedido`. Um cupom de
   * "gaste X, ganhe Y" olha pro valor total da compra, não só a parte elegível. */
  subtotalCarrinho: number;
  /** true quando pelo menos um item do carrinho é elegível pra este cupom (ver
   * Cupom.ehElegivel) — sempre true se o cupom não tem restrição de categoria/produto. */
  temItemElegivel: boolean;
  /** Quantas vezes ESSE cliente já usou este cupom (0 pra convidado/sem clienteId
   * — limiteUsoPorCliente nunca barra quem compra sem conta). */
  usosClienteAtual: number;
}

/**
 * Única porta de entrada pra decidir se um cupom pode ser aplicado a um carrinho
 * agora — centraliza todas as condições (ver card) num só lugar, na ordem que faz
 * mais sentido pro cliente entender (primeiro se o cupom em si ainda vale, depois
 * se ESTE carrinho específico se qualifica). Lança a exceção específica da
 * primeira condição que falhar — nunca uma mensagem genérica.
 */
export class ValidadorDeCupom {
  static validar(cupom: Cupom, contexto: ContextoValidacaoCupom): void {
    if (!cupom.ativo) {
      throw new CupomInativoException(cupom.codigo);
    }
    if (cupom.estaExpirado()) {
      throw new CupomExpiradoException(cupom.codigo);
    }
    if (cupom.atingiuLimiteGlobal()) {
      throw new CupomEsgotadoException(cupom.codigo);
    }
    if (
      cupom.valorMinimoPedido !== undefined &&
      contexto.subtotalCarrinho < cupom.valorMinimoPedido
    ) {
      throw new CupomValorMinimoNaoAtingidoException(cupom.codigo, cupom.valorMinimoPedido);
    }
    if (cupom.temRestricaoDeItens() && !contexto.temItemElegivel) {
      throw new CupomNaoAplicavelItensException(cupom.codigo);
    }
    if (
      cupom.limiteUsoPorCliente !== undefined &&
      contexto.usosClienteAtual >= cupom.limiteUsoPorCliente
    ) {
      throw new CupomLimiteUsoClienteExcedidoException(cupom.codigo);
    }
  }
}
