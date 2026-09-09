import { api } from '@/lib/http';

export interface Categoria {
  id: string;
  slug: string;
  nome: string;
}

// GET /categorias é público (a loja usa pros atalhos de categoria na home e no catálogo).
export function listarCategorias(opcoes?: {
  next?: { revalidate?: number };
  signal?: AbortSignal;
}): Promise<Categoria[]> {
  return api.get<Categoria[]>('/categorias', opcoes);
}
