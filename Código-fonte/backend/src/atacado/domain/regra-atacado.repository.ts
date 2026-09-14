import { RegraAtacado } from './regra-atacado.entity';
import { TipoDesconto } from '../../cupons/domain/cupom.entity';

export interface DadosCriacaoRegraAtacado {
  produtoId?: string;
  categoriaId?: string;
  quantidadeMinima: number;
  tipoDesconto: TipoDesconto;
  valor: number;
}

// Sem produtoId/categoriaId de propósito — trocar o alvo de uma regra já em uso
// é uma mudança de sentido diferente (outra regra), não uma edição. Pra "trocar o
// alvo", cria uma regra nova e desativa a antiga (mesmo padrão de Cupom.codigo).
export interface DadosAtualizacaoRegraAtacado {
  quantidadeMinima?: number;
  tipoDesconto?: TipoDesconto;
  valor?: number;
  ativo?: boolean;
}

export abstract class RegraAtacadoRepository {
  /** Todas as regras ativas que podem se aplicar a QUALQUER um destes produtos/
   * categorias — filtragem fina (quantidade, produto exato vs. categoria) fica por
   * conta de quem chama (ver CalcularDescontoAtacadoUseCase), pra não duplicar a
   * regra de elegibilidade em infra e em domínio. */
  abstract buscarAplicaveis(produtoIds: string[], categoriaIds: string[]): Promise<RegraAtacado[]>;

  /** Gestão via painel admin — todas as regras, ativas ou não. */
  abstract listarTodas(): Promise<RegraAtacado[]>;
  abstract buscarPorId(id: string): Promise<RegraAtacado | null>;
  abstract criar(dados: DadosCriacaoRegraAtacado): Promise<RegraAtacado>;
  abstract atualizar(id: string, dados: DadosAtualizacaoRegraAtacado): Promise<RegraAtacado>;
}
