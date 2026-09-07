import { Injectable } from '@nestjs/common';
import {
  ResolverCarrinhoSessaoUseCase,
  calcularExpiracao,
} from './resolver-carrinho-sessao.use-case';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';

@Injectable()
export class RemoverCupomCarrinhoUseCase {
  constructor(
    private readonly resolverCarrinhoSessaoUseCase: ResolverCarrinhoSessaoUseCase,
    private readonly carrinhoSessaoRepository: CarrinhoSessaoRepository,
  ) {}

  async executar(
    sessionToken: string | undefined,
    clienteId: string | undefined,
  ): Promise<string | undefined> {
    const { carrinho } = await this.resolverCarrinhoSessaoUseCase.executar(
      sessionToken,
      clienteId,
      false,
    );
    if (!carrinho) return sessionToken;

    await this.carrinhoSessaoRepository.definirCupom(carrinho.id, null, calcularExpiracao());
    return carrinho.sessionToken;
  }
}
