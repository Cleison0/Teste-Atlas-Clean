import { listarProdutos } from '@/lib/produtos';

// Contagem aproximada é suficiente aqui — não é um dado crítico, revalidate longo.
const REVALIDATE_SEGUNDOS = 3600;

// Só afirmações verificáveis: contagem real do catálogo, e integrações que realmente
// existem (Mercado Pago pro pagamento, WhatsApp pro atendimento). Nada de nota média,
// "clientes satisfeitos" ou tempo de resposta — não temos como provar esses números
// hoje (ver ReviewsSection pras avaliações reais, essas sim vindas do backend).
export async function TrustBadges() {
  let totalProdutos: number | null = null;
  try {
    const resultado = await listarProdutos(
      { pagina: 1, limite: 1 },
      { next: { revalidate: REVALIDATE_SEGUNDOS } },
    );
    totalProdutos = resultado.total;
  } catch {
    // Isolado: sem o total, mostra o selo sem o número em vez de derrubar a seção.
  }

  const selos = [
    {
      icone: '🔒',
      texto: 'Pagamento seguro',
      detalhe: 'Pix e cartão via Mercado Pago',
    },
    {
      icone: '💬',
      texto: 'Atendimento direto',
      detalhe: 'Fala com a gente pelo WhatsApp',
    },
    {
      icone: '🧴',
      texto:
        totalProdutos !== null
          ? `+${totalProdutos} produtos no catálogo`
          : 'Catálogo com limpeza, descartáveis e papelaria',
      detalhe: 'Atacado e varejo, mesmo preço',
    },
  ];

  return (
    <div className="mx-auto grid max-w-[1180px] gap-3 px-5 nav:grid-cols-3">
      {selos.map((selo) => (
        <div
          key={selo.texto}
          className="flex items-center gap-3 rounded-atlas border border-line bg-white p-4 shadow-atlas"
        >
          <span className="text-2xl" aria-hidden="true">
            {selo.icone}
          </span>
          <span>
            <span className="block text-[13px] font-bold text-navy">{selo.texto}</span>
            <span className="text-[12px] text-muted">{selo.detalhe}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
