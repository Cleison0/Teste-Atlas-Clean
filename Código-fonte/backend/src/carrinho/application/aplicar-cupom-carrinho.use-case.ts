import { Injectable } from '@nestjs/common';
import {
  ResolverCarrinhoSessaoUseCase,
  calcularExpiracao,
} from './resolver-carrinho-sessao.use-case';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { CarrinhoVazioException } from '../domain/carrinho.exceptions';
import { CupomRepository } from '../../cupons/domain/cupom.repository';
import { CupomInvalidoException } from '../../cupons/domain/cupons.exceptions';

/** Não cria carrinho pra aplicar cupom (criarSeNaoExistir: false) — não tem o que
 * descontar num carrinho vazio/inexistente, então isso é erro do cliente, não um
 * caso a resolver criando um carrinho vazio com cupom. */
@Injectable()
export class AplicarCupomCarrinhoUseCase {
  constructor(
    private readonly resolverCarrinhoSessaoUseCase: ResolverCarrinhoSessaoUseCase,
    private readonly carrinhoSessaoRepository: CarrinhoSessaoRepository,
    private readonly cupomRepository: CupomRepository,
  ) {}

  async executar(
    sessionToken: string | undefined,
    clienteId: string | undefined,
    cupomCodigo: string,
  ): Promise<string | undefined> {
    const { carrinho } = await this.resolverCarrinhoSessaoUseCase.executar(
      sessionToken,
      clienteId,
      false,
    );
    if (!carrinho || carrinho.itens.length === 0) {
      throw new CarrinhoVazioException();
    }

    // CriarCupomUseCase sempre normaliza o código pra maiúsculo antes de gravar —
    // normaliza aqui também, senão um cliente digitando minúsculo nunca acharia
    // um cupom que existe (mesmo cuidado de MontarCarrinhoUseCase).
    const cupom = await this.cupomRepository.buscarPorCodigo(cupomCodigo.toUpperCase());
    if (!cupom || !cupom.estaValido()) {
      throw new CupomInvalidoException(cupomCodigo);
    }

    await this.carrinhoSessaoRepository.definirCupom(
      carrinho.id,
      cupom.codigo,
      calcularExpiracao(),
    );
    return carrinho.sessionToken;
  }
}
