import { listarProdutos } from '@/lib/produtos';
import { ProductCarousel } from './ProductCarousel';

const QUANTIDADE = 12;
// Estoque/preço/ativo mudam via admin a qualquer momento — revalidate curto.
const REVALIDATE_SEGUNDOS = 120;
// Abaixo disso o carrossel fica esparso demais pra fazer sentido como "novidades".
const MINIMO_PARA_EXIBIR = 3;

export async function NovidadesSection() {
  let itens;
  try {
    const resultado = await listarProdutos(
      { pagina: 1, limite: QUANTIDADE, ordenarPor: 'createdAt', direcao: 'desc' },
      { next: { revalidate: REVALIDATE_SEGUNDOS } },
    );
    itens = resultado.itens;
  } catch {
    // Isolado: se /produtos falhar aqui, some só essa seção — o resto da home segue.
    return null;
  }

  if (itens.length < MINIMO_PARA_EXIBIR) return null;

  return (
    <section aria-label="Novidades" className="mx-auto max-w-[1180px] px-5 py-10">
      <p className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue">
        <span className="h-px w-4 bg-blue" aria-hidden="true" />
        Chegou agora
      </p>
      <h2 className="mb-6 font-display text-xl font-bold text-navy">Novidades no catálogo</h2>
      <ProductCarousel produtos={itens} rotulo="novidades" />
    </section>
  );
}
