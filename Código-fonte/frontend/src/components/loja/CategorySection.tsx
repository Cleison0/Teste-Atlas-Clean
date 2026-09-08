import { listarProdutos } from '@/lib/produtos';
import { CategoryGrid } from './CategoryGrid';

const NOMES: Record<string, string> = {
  limpeza: 'Limpeza',
  descartaveis: 'Descartáveis',
  papelaria: 'Papelaria',
};

// Estoque/preço/ativo mudam via admin a qualquer momento — revalidate curto.
const REVALIDATE_SEGUNDOS = 120;

export interface CategorySectionProps {
  categoria: 'limpeza' | 'descartaveis' | 'papelaria';
  numero: string;
  indice: number;
  total: number;
}

export async function CategorySection({
  categoria,
  numero,
  indice,
  total: totalCategorias,
}: CategorySectionProps) {
  let itens, total;
  try {
    const resultado = await listarProdutos(
      { pagina: 1, limite: 200, categoria },
      { next: { revalidate: REVALIDATE_SEGUNDOS } },
    );
    itens = resultado.itens;
    total = resultado.total;
  } catch {
    // Isolado: se /produtos falhar pra essa categoria, some só esse bloco — o resto da home segue.
    return null;
  }

  return (
    <section id={categoria} className="relative mx-auto max-w-[1180px] px-5 py-10">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-[46px] left-[-6px] z-0 select-none font-display text-[96px] font-bold leading-none text-navy/5"
      >
        {numero}
      </span>
      <div className="relative z-10 mb-5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue">
          Categoria {indice} de {totalCategorias}
        </p>
        <h2 className="font-display text-2xl font-bold text-navy">{NOMES[categoria]}</h2>
        <p className="text-[13px] text-muted">{total} produtos</p>
      </div>
      <div className="relative">
        <CategoryGrid produtos={itens} />
      </div>
    </section>
  );
}
