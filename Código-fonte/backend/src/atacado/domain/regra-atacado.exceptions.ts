import { DomainException } from '../../shared/exceptions/domain.exception';

export class RegraAtacadoNaoEncontradaException extends DomainException {
  readonly code = 'REGRA_ATACADO_NAO_ENCONTRADA';

  constructor(id: string) {
    super(`Regra de atacado ${id} não encontrada.`);
  }
}

/** Lançada pelo construtor de RegraAtacado — chamada também diretamente pelos
 * use cases de criação/atualização ANTES de escrever no banco, mesmo padrão de
 * CupomValorInvalidoException (nunca persistir um valor inválido primeiro). */
export class RegraAtacadoValorInvalidoException extends DomainException {
  readonly code = 'REGRA_ATACADO_VALOR_INVALIDO';

  constructor(mensagem: string) {
    super(mensagem);
  }
}

/** produtoId e categoriaId são mutuamente exclusivos — exatamente um dos dois. */
export class RegraAtacadoAlvoInvalidoException extends DomainException {
  readonly code = 'REGRA_ATACADO_ALVO_INVALIDO';

  constructor(mensagem: string) {
    super(mensagem);
  }
}
