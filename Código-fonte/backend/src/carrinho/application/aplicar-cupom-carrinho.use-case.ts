import { Injectable } from '@nestjs/common';
import {
  ResolverCarrinhoSessaoUseCase,
  calcularExpiracao,
} from './resolver-carrinho-sessao.use-case';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { CarrinhoVazioException } from '../domain/carrinho.exceptions';
import { MontarCarrinhoUseCase } from './montar-carrinho.use-case';

/** Não cria carrinho pra aplicar cupom (criarSeNaoExistir: false) — não tem o que
 * descontar num carrinho vazio/inexistente, então isso é erro do cliente, não um
 * caso a resolver criando um carrinho vazio com cupom. */
@Injectable()
export class AplicarCupomCarrinhoUseCase {
  constructor(
    private readonly resolverCarrinhoSessaoUseCase: ResolverCarrinhoSessaoUseCase,
    private readonly carrinhoSessaoRepository: CarrinhoSessaoRepository,
    private readonly montarCarrinhoUseCase: MontarCarrinhoUseCase,
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

    // Reaproveita MontarCarrinhoUseCase como única fonte de verdade sobre "esse
    // cupom se aplica a este carrinho" — mesmo cálculo de preço/atacado/elegibilidade
    // que VisualizarCarrinhoUseCase usa depois pra montar a resposta. Lança a
    // exceção específica (CupomExpiradoException, CupomValorMinimoNaoAtingidoException
    // etc.) direto pro controller se não passar — não persiste nada nesse caso.
    await this.montarCarrinhoUseCase.executar(
      carrinho.itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade })),
      cupomCodigo,
      clienteId,
    );

    await this.carrinhoSessaoRepository.definirCupom(
      carrinho.id,
      cupomCodigo.toUpperCase(),
      calcularExpiracao(),
    );
    return carrinho.sessionToken;
  }
}
