import { adminApi } from '@/lib/admin-api';

export type TipoDescontoAtacado = 'PERCENTUAL' | 'VALOR_FIXO';

export interface RegraAtacadoAdmin {
  id: string;
  produtoId?: string;
  categoriaId?: string;
  quantidadeMinima: number;
  tipoDesconto: TipoDescontoAtacado;
  valor: number;
  ativo: boolean;
  createdAt: string;
}

export interface DadosCriacaoRegraAtacadoAdmin {
  produtoId?: string;
  categoriaId?: string;
  quantidadeMinima: number;
  tipoDesconto: TipoDescontoAtacado;
  valor: number;
}

// Sem produtoId/categoriaId de propósito — o backend rejeita edição do alvo depois
// de criada (ver comentário no backend, RegraAtacadoRepository).
export interface DadosAtualizacaoRegraAtacadoAdmin {
  quantidadeMinima?: number;
  tipoDesconto?: TipoDescontoAtacado;
  valor?: number;
  ativo?: boolean;
}

export function listarRegrasAtacadoAdmin(): Promise<RegraAtacadoAdmin[]> {
  return adminApi.get<RegraAtacadoAdmin[]>('/regras-atacado');
}

export function criarRegraAtacadoAdmin(
  dados: DadosCriacaoRegraAtacadoAdmin,
): Promise<RegraAtacadoAdmin> {
  return adminApi.post<RegraAtacadoAdmin>('/regras-atacado', dados);
}

export function atualizarRegraAtacadoAdmin(
  id: string,
  dados: DadosAtualizacaoRegraAtacadoAdmin,
): Promise<RegraAtacadoAdmin> {
  return adminApi.put<RegraAtacadoAdmin>(`/regras-atacado/${id}`, dados);
}
