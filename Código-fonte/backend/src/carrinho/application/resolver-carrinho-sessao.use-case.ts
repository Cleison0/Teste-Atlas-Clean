import { Injectable } from '@nestjs/common';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { CarrinhoSessao } from '../domain/carrinho-sessao';
import { gerarTokenOpaco } from '../../shared/token.util';

const TTL_CARRINHO_DIAS = 30;

export interface ResultadoResolucaoCarrinho {
  carrinho: CarrinhoSessao | undefined;
  /** Preenchido só quando um sessionToken novo foi gerado (carrinho recém-criado) —
   * é isso que o controller usa pra decidir se devolve um token novo pro cliente. */
  sessionTokenNovo: string | undefined;
}

function calcularExpiracao(): Date {
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + TTL_CARRINHO_DIAS);
  return expiraEm;
}

/**
 * Resolve qual carrinho persistido corresponde a esta requisição — por cliente
 * logado (prioridade) ou por sessionToken anônimo — e opcionalmente cria um novo
 * quando nada é encontrado.
 *
 * Também aplica duas regras de login:
 * - "Adoção": quando o cliente ainda não tem carrinho próprio, o carrinho anônimo
 *   (se houver) passa a ser dele — nenhuma fusão necessária, é o mesmo carrinho.
 * - "Merge": quando o cliente JÁ tem carrinho próprio (ex: comprou de outro
 *   aparelho antes) e loga com um sessionToken de carrinho anônimo diferente e com
 *   itens, as quantidades desse carrinho anônimo são somadas no carrinho do
 *   cliente (mesmo produto soma, produto novo entra) e o carrinho anônimo fica
 *   vazio — sem isso, os itens que o cliente acabou de adicionar antes de logar
 *   simplesmente desapareceriam.
 */
@Injectable()
export class ResolverCarrinhoSessaoUseCase {
  constructor(private readonly carrinhoSessaoRepository: CarrinhoSessaoRepository) {}

  async executar(
    sessionToken: string | undefined,
    clienteId: string | undefined,
    criarSeNaoExistir: boolean,
  ): Promise<ResultadoResolucaoCarrinho> {
    if (clienteId) {
      const carrinhoDoCliente = await this.carrinhoSessaoRepository.buscarPorClienteId(clienteId);
      if (carrinhoDoCliente) {
        const carrinhoFundido = await this.fundirCarrinhoAnonimoSeHouver(
          sessionToken,
          carrinhoDoCliente,
        );
        return { carrinho: carrinhoFundido, sessionTokenNovo: undefined };
      }
    }

    if (sessionToken) {
      const carrinhoAnonimo =
        await this.carrinhoSessaoRepository.buscarPorSessionToken(sessionToken);
      if (carrinhoAnonimo) {
        if (clienteId && !carrinhoAnonimo.clienteId) {
          await this.carrinhoSessaoRepository.adotarPorCliente(carrinhoAnonimo.id, clienteId);
        }
        return { carrinho: carrinhoAnonimo, sessionTokenNovo: undefined };
      }
    }

    if (!criarSeNaoExistir) {
      return { carrinho: undefined, sessionTokenNovo: undefined };
    }

    // Nunca reaproveita um sessionToken recebido mas não encontrado no banco — pode
    // ter expirado/sido limpo, ou colidir com uma criação concorrente da mesma
    // requisição em outra aba. Sempre gera um valor novo pra criar.
    const novoToken = gerarTokenOpaco().valor;
    const carrinhoCriado = await this.carrinhoSessaoRepository.criar(
      novoToken,
      clienteId,
      calcularExpiracao(),
    );
    return { carrinho: carrinhoCriado, sessionTokenNovo: novoToken };
  }

  /**
   * Se `sessionToken` aponta pra um carrinho anônimo diferente do `carrinhoDoCliente`
   * (mesmo sessionToken = já é o mesmo carrinho, nada a fazer) e esse carrinho anônimo
   * tem itens, soma as quantidades no carrinho do cliente e esvazia o anônimo.
   * Devolve o carrinho do cliente já atualizado (ou o original, se não havia nada
   * pra fundir).
   */
  private async fundirCarrinhoAnonimoSeHouver(
    sessionToken: string | undefined,
    carrinhoDoCliente: CarrinhoSessao,
  ): Promise<CarrinhoSessao> {
    if (!sessionToken || sessionToken === carrinhoDoCliente.sessionToken) {
      return carrinhoDoCliente;
    }

    const carrinhoAnonimo = await this.carrinhoSessaoRepository.buscarPorSessionToken(sessionToken);
    if (!carrinhoAnonimo || carrinhoAnonimo.clienteId || carrinhoAnonimo.itens.length === 0) {
      return carrinhoDoCliente;
    }

    const expiraEm = calcularExpiracao();
    for (const item of carrinhoAnonimo.itens) {
      await this.carrinhoSessaoRepository.upsertItem(
        carrinhoDoCliente.id,
        item.produtoId,
        item.quantidade,
        expiraEm,
      );
    }
    await this.carrinhoSessaoRepository.limpar(carrinhoAnonimo.id);

    const carrinhoAtualizado = await this.carrinhoSessaoRepository.buscarPorClienteId(
      carrinhoDoCliente.clienteId!,
    );
    return carrinhoAtualizado ?? carrinhoDoCliente;
  }
}

export { TTL_CARRINHO_DIAS, calcularExpiracao };
