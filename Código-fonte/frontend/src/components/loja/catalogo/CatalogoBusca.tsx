'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export interface CatalogoBuscaProps {
  valor: string;
  aoMudar: (valor: string) => void;
}

const ATRASO_MS = 400;

// Estado local pra digitação ficar instantânea (sem re-render da URL a cada tecla)
// — só propaga pro catálogo (e daí pra URL/query) depois de ATRASO_MS parado.
export function CatalogoBusca({ valor, aoMudar }: CatalogoBuscaProps) {
  const [texto, setTexto] = useState(valor);
  const textoComAtraso = useDebounce(texto, ATRASO_MS);
  const primeiraRenderizacao = useRef(true);

  // Se `valor` mudar por fora (ex: "Limpar filtros", navegação back/forward),
  // acompanha na hora, sem esperar o debounce — ajustado durante o render (não num
  // efeito) seguindo o padrão recomendado pra "resetar estado quando uma prop muda"
  // (evita o cascading render que useEffect + setState causaria aqui).
  const [valorAnterior, setValorAnterior] = useState(valor);
  if (valor !== valorAnterior) {
    setValorAnterior(valor);
    setTexto(valor);
  }

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    aoMudar(textoComAtraso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoComAtraso]);

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden="true"
      >
        🔍
      </span>
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar por nome ou descrição…"
        aria-label="Buscar produtos"
        className="w-full rounded-atlas-sm border border-line bg-white py-2.5 pl-9 pr-3.5 font-sans text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-blue/40"
      />
    </div>
  );
}
