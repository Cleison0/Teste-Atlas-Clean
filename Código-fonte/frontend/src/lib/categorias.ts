import { api } from '@/lib/http';

export interface Categoria {
  id: string;
  slug: string;
  nome: string;
}

// GET /categorias é público (a loja usa pros atalhos de categoria na home).
export function listarCategorias(opcoes?: {
  next?: { revalidate?: number };
}): Promise<Categoria[]> {
  return api.get<Categoria[]>('/categorias', opcoes);
}
