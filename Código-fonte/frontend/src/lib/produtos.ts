import { api } from '@/lib/http';

export interface MarcaDoProduto {
  id: string;
  nome: string;
  imagemUrl?: string;
}

/** Tipo genérico (ex: "Detergente para Louça") que agrupa as variantes de marca/pack
 * de um mesmo produto — usado pra decidir card simples vs "Ver opções" e pra montar
 * o link da página de detalhe (/produtos/[slug]). */
export interface ProdutoTipoDoProduto {
  slug: string;
  nome: string;
}

export interface Produto {
  id: string;
  nome: string;
  slug: string;
  descricao?: string;
  categoria?: string;
  preco: number;
  /** Presente só quando há promoção ativa (sempre menor que `preco`). */
  precoPromocional?: number;
  estoque: number;
  ativo: boolean;
  pack?: string;
  marca?: MarcaDoProduto;
  produtoTipo?: ProdutoTipoDoProduto;
}

export interface ProdutoPaginado {
  itens: Produto[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ImagemProduto {
  id: string;
  produtoId: string;
  url: string;
  thumbnailUrl: string;
  ordem: number;
  principal: boolean;
}

// Loja pública: sempre ativo=true, diferente do admin (que precisa ver inativos também).
export function listarProdutos(
  params: {
    pagina: number;
    limite: number;
    busca?: string;
    categoria?: string;
    emPromocao?: boolean;
    ordenarPor?: 'nome' | 'preco' | 'createdAt';
    direcao?: 'asc' | 'desc';
  },
  opcoes?: { next?: { revalidate?: number } },
): Promise<ProdutoPaginado> {
  const query = new URLSearchParams({
    pagina: String(params.pagina),
    limite: String(params.limite),
    ativo: 'true',
  });
  if (params.busca) query.set('busca', params.busca);
  if (params.categoria) query.set('categoria', params.categoria);
  if (params.emPromocao) query.set('emPromocao', 'true');
  if (params.ordenarPor) query.set('ordenarPor', params.ordenarPor);
  if (params.direcao) query.set('direcao', params.direcao);
  return api.get<ProdutoPaginado>(`/produtos?${query.toString()}`, opcoes);
}

// Sem paginação de propósito — é sempre um "top N" curto, mesmo padrão de /marcas.
export function listarProdutosMaisVendidos(
  limite: number,
  opcoes?: { next?: { revalidate?: number } },
): Promise<Produto[]> {
  return api.get<Produto[]>(`/produtos/mais-vendidos?limite=${limite}`, opcoes);
}

export function listarImagensProduto(produtoId: string): Promise<ImagemProduto[]> {
  return api.get<ImagemProduto[]>(`/produtos/${produtoId}/imagens`);
}
