import { RegraAtacado } from './regra-atacado.entity';

/**
 * Só leitura por enquanto — criação/gestão de regras de atacado é via seed/script
 * direto no banco (mesma limitação temporária documentada pra Cupom; não é escopo
 * deste card construir um painel admin pra isso).
 */
export abstract class RegraAtacadoRepository {
  /** Todas as regras ativas que podem se aplicar a QUALQUER um destes produtos/
   * categorias — filtragem fina (quantidade, produto exato vs. categoria) fica por
   * conta de quem chama (ver CalcularDescontoAtacadoUseCase), pra não duplicar a
   * regra de elegibilidade em infra e em domínio. */
  abstract buscarAplicaveis(produtoIds: string[], categoriaIds: string[]): Promise<RegraAtacado[]>;
}
