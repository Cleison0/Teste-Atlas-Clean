import { Suspense } from 'react';
import { CatalogoPagina } from '@/components/loja/catalogo/CatalogoPagina';
import { ProductGridSkeleton } from '@/components/ui/Skeleton';

// A listagem em si é toda client-side (React Query + useSearchParams) — filtro,
// busca, ordenação e paginação precisam atualizar a URL e refazer a query sem
// recarregar a página inteira, com cache por combinação de filtros e cancelamento
// da requisição anterior, o que useSearchParams + React Query resolvem de forma
// mais direta que um Server Component recarregando a cada mudança. O Suspense aqui
// é exigido pelo Next pra usar useSearchParams num componente que pode ser
// pré-renderizado estaticamente — sem ele o build reclama.
export default function CatalogoPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-[1180px] px-5 py-10">
          <ProductGridSkeleton quantidade={12} />
        </main>
      }
    >
      <CatalogoPagina />
    </Suspense>
  );
}
