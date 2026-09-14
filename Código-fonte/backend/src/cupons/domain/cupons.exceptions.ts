import { DomainException } from '../../shared/exceptions/domain.exception';

export class CupomNaoEncontradoException extends DomainException {
  readonly code = 'CUPOM_NAO_ENCONTRADO';

  constructor(id: string) {
    super(`Cupom ${id} não encontrado.`);
  }
}

/** Lançada pelo construtor de Cupom (via Cupom.validarTipoEValor) — chamada
 * também diretamente por CriarCupomUseCase/AtualizarCupomUseCase ANTES de
 * escrever no banco, pra nunca persistir um valor inválido primeiro e falhar
 * só ao reconstruir o domínio depois. */
export class CupomValorInvalidoException extends DomainException {
  readonly code = 'CUPOM_VALOR_INVALIDO';

  constructor(mensagem: string) {
    super(mensagem);
  }
}

export class CupomCodigoDuplicadoException extends DomainException {
  readonly code = 'CUPOM_CODIGO_DUPLICADO';

  constructor(codigo: string) {
    super(`Já existe um cupom com o código "${codigo}".`);
  }
}

/** Código digitado não corresponde a nenhum cupom cadastrado — distinto dos erros
 * abaixo (cupom existe mas não pode ser usado agora), pra UI diferenciar "cupom não
 * existe" de "esse cupom não serve pra você agora". */
export class CupomCodigoInvalidoException extends DomainException {
  readonly code = 'CUPOM_CODIGO_INVALIDO';

  constructor(codigo: string) {
    super(`Não existe cupom com o código "${codigo}".`);
  }
}

export class CupomInativoException extends DomainException {
  readonly code = 'CUPOM_INATIVO';

  constructor(codigo: string) {
    super(`Cupom "${codigo}" está desativado.`);
  }
}

export class CupomExpiradoException extends DomainException {
  readonly code = 'CUPOM_EXPIRADO';

  constructor(codigo: string) {
    super(`Cupom "${codigo}" expirou.`);
  }
}

export class CupomEsgotadoException extends DomainException {
  readonly code = 'CUPOM_ESGOTADO';

  constructor(codigo: string) {
    super(`Cupom "${codigo}" atingiu o limite de usos.`);
  }
}

export class CupomValorMinimoNaoAtingidoException extends DomainException {
  readonly code = 'CUPOM_VALOR_MINIMO_NAO_ATINGIDO';

  constructor(codigo: string, valorMinimo: number) {
    super(
      `Cupom "${codigo}" exige um pedido de pelo menos ${valorMinimo.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })}.`,
    );
  }
}

export class CupomNaoAplicavelItensException extends DomainException {
  readonly code = 'CUPOM_NAO_APLICAVEL_ITENS';

  constructor(codigo: string) {
    super(`Cupom "${codigo}" não é válido para os itens deste carrinho.`);
  }
}

export class CupomLimiteUsoClienteExcedidoException extends DomainException {
  readonly code = 'CUPOM_LIMITE_USO_CLIENTE_EXCEDIDO';

  constructor(codigo: string) {
    super(`Você já usou o cupom "${codigo}" o número máximo de vezes permitido.`);
  }
}
