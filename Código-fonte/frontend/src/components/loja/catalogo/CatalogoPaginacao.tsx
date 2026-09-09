'use client';

export interface CatalogoPaginacaoProps {
  paginaAtual: number;
  totalPaginas: number;
  aoMudar: (pagina: number) => void;
}

const JANELA = 2;

function paginasVisiveis(atual: number, total: number): (number | 'reticencias')[] {
  const paginas = new Set<number>([1, total]);
  for (let p = atual - JANELA; p <= atual + JANELA; p++) {
    if (p >= 1 && p <= total) paginas.add(p);
  }
  const ordenadas = [...paginas].sort((a, b) => a - b);

  const resultado: (number | 'reticencias')[] = [];
  for (let i = 0; i < ordenadas.length; i++) {
    if (i > 0 && ordenadas[i] - ordenadas[i - 1] > 1) resultado.push('reticencias');
    resultado.push(ordenadas[i]);
  }
  return resultado;
}

// Paginação numerada, não scroll infinito: a API de listagem é por offset/limit
// (pagina/limite → total/totalPaginas), o que casa direto com números de página —
// e o requisito de URL compartilhável ("copiar e abrir em outra aba") pede uma
// página específica, não uma posição de scroll. Ver README do card pra mais detalhe.
export function CatalogoPaginacao({ paginaAtual, totalPaginas, aoMudar }: CatalogoPaginacaoProps) {
  if (totalPaginas <= 1) return null;

  return (
    <nav
      aria-label="Paginação do catálogo"
      className="mt-8 flex items-center justify-center gap-1.5"
    >
      <button
        type="button"
        onClick={() => aoMudar(paginaAtual - 1)}
        disabled={paginaAtual === 1}
        aria-label="Página anterior"
        className="flex h-9 w-9 items-center justify-center rounded-atlas-sm border border-line bg-white text-navy hover:bg-sky disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>

      {paginasVisiveis(paginaAtual, totalPaginas).map((item, indice) =>
        item === 'reticencias' ? (
          <span key={`reticencias-${indice}`} className="px-1 text-[13px] text-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => aoMudar(item)}
            aria-current={item === paginaAtual ? 'page' : undefined}
            className={[
              'flex h-9 w-9 items-center justify-center rounded-atlas-sm text-[13px] font-semibold',
              item === paginaAtual
                ? 'bg-navy text-white'
                : 'border border-line bg-white text-navy hover:bg-sky',
            ].join(' ')}
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => aoMudar(paginaAtual + 1)}
        disabled={paginaAtual === totalPaginas}
        aria-label="Próxima página"
        className="flex h-9 w-9 items-center justify-center rounded-atlas-sm border border-line bg-white text-navy hover:bg-sky disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </nav>
  );
}
