import { adminApi } from '@/lib/admin-api';

export type TipoDescontoCupom = 'PERCENTUAL' | 'VALOR_FIXO';

export interface CupomAdmin {
  id: string;
  codigo: string;
  tipoDesconto: TipoDescontoCupom;
  valor: number;
  ativo: boolean;
  usosCount: number;
  validoAte?: string;
  usoMaximo?: number;
  valorMinimoPedido?: number;
  limiteUsoPorCliente?: number;
  categoriaIds: string[];
  produtoIds: string[];
  createdAt: string;
}

export interface DadosCriacaoCupomAdmin {
  codigo: string;
  tipoDesconto: TipoDescontoCupom;
  valor: number;
  validoAte?: string;
  usoMaximo?: number;
  valorMinimoPedido?: number;
  limiteUsoPorCliente?: number;
  categoriaIds?: string[];
  produtoIds?: string[];
}

// Sem `codigo` de propósito — o backend rejeita edição do código depois de criado.
export interface DadosAtualizacaoCupomAdmin {
  tipoDesconto?: TipoDescontoCupom;
  valor?: number;
  ativo?: boolean;
  validoAte?: string;
  usoMaximo?: number;
  valorMinimoPedido?: number;
  limiteUsoPorCliente?: number;
  /** Quando enviado (mesmo array vazio), SUBSTITUI o conjunto inteiro — mesmo
   * contrato do backend (ver DadosAtualizacaoCupom). */
  categoriaIds?: string[];
  produtoIds?: string[];
}

export function listarCuponsAdmin(): Promise<CupomAdmin[]> {
  return adminApi.get<CupomAdmin[]>('/cupons');
}

export function criarCupomAdmin(dados: DadosCriacaoCupomAdmin): Promise<CupomAdmin> {
  return adminApi.post<CupomAdmin>('/cupons', dados);
}

export function atualizarCupomAdmin(
  id: string,
  dados: DadosAtualizacaoCupomAdmin,
): Promise<CupomAdmin> {
  return adminApi.put<CupomAdmin>(`/cupons/${id}`, dados);
}
