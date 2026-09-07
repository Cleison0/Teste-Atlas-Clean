import { listarResenhas } from '@/lib/resenhas';
import { ReviewsBody } from './ReviewsBody';

// Novas avaliações não são urgentes de refletir na hora — revalidate moderado.
const REVALIDATE_SEGUNDOS = 300;

export async function ReviewsSection() {
  let resenhas;
  try {
    resenhas = await listarResenhas({ next: { revalidate: REVALIDATE_SEGUNDOS } });
  } catch {
    // Isolado: se /resenhas falhar, some só esse bloco — o resto da home segue.
    return null;
  }

  return (
    <section id="avaliacoes" className="mx-auto max-w-[1180px] scroll-mt-20 px-5 py-10">
      <div className="mb-7 max-w-[60ch]">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-blue">
          Avaliações de clientes
        </p>
        <h2 className="font-display text-2xl font-bold text-navy">
          O que dizem sobre a Atlas Nova Clean
        </h2>
      </div>
      <ReviewsBody resenhasIniciais={resenhas} />
    </section>
  );
}
