import type { FiltrosListarProdutos } from '@/lib/produtos';

export type Ordenacao = 'relevancia' | 'menor-preco' | 'maior-preco';

export interface FiltrosCatalogo {
  q: string;
  categorias: string[];
  marcas: string[];
  precoMin?: number;
  precoMax?: number;
  disponivel: boolean;
  ordenacao: Ordenacao;
  pagina: number;
}

export const FILTROS_VAZIOS: FiltrosCatalogo = {
  q: '',
  categorias: [],
  marcas: [],
  precoMin: undefined,
  precoMax: undefined,
  disponivel: false,
  ordenacao: 'relevancia',
  pagina: 1,
};

/**
 * "Relevância" não existe de verdade no backend (sem busca full-text com ranking) —
 * na prática é a ordem padrão da API (createdAt desc). Documentado aqui, não fingido
 * na UI: por isso o dropdown de ordenação não tem uma opção separada de "mais
 * recentes" — seria idêntica a "Relevância" e só confundiria.
 */
export function paraParametrosApi(
  ordenacao: Ordenacao,
): Pick<FiltrosListarProdutos, 'ordenarPor' | 'direcao'> {
  switch (ordenacao) {
    case 'menor-preco':
      return { ordenarPor: 'preco', direcao: 'asc' };
    case 'maior-preco':
      return { ordenarPor: 'preco', direcao: 'desc' };
    case 'relevancia':
    default:
      return { ordenarPor: 'createdAt', direcao: 'desc' };
  }
}

/** Lê o estado de filtros a partir da URL. Aceita `?categoria=slug` (singular,
 * legado — usado pelos atalhos de categoria da Home) além de `?categorias=` (plural,
 * usado pelos checkboxes do próprio catálogo) — o legado só entra se o plural
 * estiver vazio, pra não duplicar entrada quando a URL já foi reescrita pelo catálogo. */
export function filtrosDaUrl(searchParams: URLSearchParams): FiltrosCatalogo {
  const categoriasPlural = searchParams.getAll('categorias');
  const categoriaLegado = searchParams.get('categoria');
  const categorias =
    categoriasPlural.length > 0 ? categoriasPlural : categoriaLegado ? [categoriaLegado] : [];

  const precoMinRaw = searchParams.get('precoMin');
  const precoMaxRaw = searchParams.get('precoMax');
  const ordenacaoRaw = searchParams.get('ordenacao');
  const paginaRaw = searchParams.get('pagina');

  return {
    q: searchParams.get('q') ?? '',
    categorias,
    marcas: searchParams.getAll('marcas'),
    precoMin: precoMinRaw ? Number(precoMinRaw) : undefined,
    precoMax: precoMaxRaw ? Number(precoMaxRaw) : undefined,
    disponivel: searchParams.get('disponivel') === 'true',
    ordenacao: (['relevancia', 'menor-preco', 'maior-preco'] as const).includes(
      ordenacaoRaw as Ordenacao,
    )
      ? (ordenacaoRaw as Ordenacao)
      : 'relevancia',
    pagina: paginaRaw ? Math.max(1, Number(paginaRaw)) : 1,
  };
}

/** Serializa de volta pra query string — sempre a forma canônica (plural), nunca
 * reemite `?categoria=` singular (uma vez que o usuário mexeu num filtro, a URL
 * passa a refletir o estado real do catálogo, não mais o link de origem da Home). */
export function filtrosParaUrl(filtros: FiltrosCatalogo): string {
  const params = new URLSearchParams();
  if (filtros.q) params.set('q', filtros.q);
  for (const categoria of filtros.categorias) params.append('categorias', categoria);
  for (const marca of filtros.marcas) params.append('marcas', marca);
  if (filtros.precoMin !== undefined) params.set('precoMin', String(filtros.precoMin));
  if (filtros.precoMax !== undefined) params.set('precoMax', String(filtros.precoMax));
  if (filtros.disponivel) params.set('disponivel', 'true');
  if (filtros.ordenacao !== 'relevancia') params.set('ordenacao', filtros.ordenacao);
  if (filtros.pagina > 1) params.set('pagina', String(filtros.pagina));
  return params.toString();
}

export function temFiltroAtivo(filtros: FiltrosCatalogo): boolean {
  return (
    filtros.q !== '' ||
    filtros.categorias.length > 0 ||
    filtros.marcas.length > 0 ||
    filtros.precoMin !== undefined ||
    filtros.precoMax !== undefined ||
    filtros.disponivel
  );
}
