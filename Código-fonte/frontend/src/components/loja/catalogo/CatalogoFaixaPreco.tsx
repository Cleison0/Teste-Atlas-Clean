'use client';

import { useId, useState } from 'react';

export interface CatalogoFaixaPrecoProps {
  /** Limites reais do catálogo (ver precoMinCatalogo/precoMaxCatalogo da API). */
  limiteMin: number;
  limiteMax: number;
  valorMin: number;
  valorMax: number;
  onChangeCommitted: (min: number, max: number) => void;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Dois <input type="range"> sobrepostos na mesma trilha — cada um continua
// nativamente focável/operável por teclado (setas, Home/End), sem precisar
// reimplementar um slider ARIA do zero. Só dispara onChangeCommitted em
// mouseup/keyup/touchend (não a cada pixel arrastado) — refazer a query de
// produtos a cada frame do arrasto seria emitir dezenas de requisições à toa.
export function CatalogoFaixaPreco({
  limiteMin,
  limiteMax,
  valorMin,
  valorMax,
  onChangeCommitted,
}: CatalogoFaixaPrecoProps) {
  const idBase = useId();
  const [rascunhoMin, setRascunhoMin] = useState(valorMin);
  const [rascunhoMax, setRascunhoMax] = useState(valorMax);

  // A URL é a fonte da verdade — se o usuário limpar filtros ou navegar
  // back/forward, o rascunho local (usado durante o arrasto) precisa acompanhar.
  // Ajustado durante o render (não num efeito) seguindo o padrão recomendado pra
  // "resetar estado quando uma prop muda" — evita o cascading render de
  // useEffect + setState.
  const [propsAnteriores, setPropsAnteriores] = useState({ valorMin, valorMax });
  if (propsAnteriores.valorMin !== valorMin || propsAnteriores.valorMax !== valorMax) {
    setPropsAnteriores({ valorMin, valorMax });
    setRascunhoMin(valorMin);
    setRascunhoMax(valorMax);
  }

  const faixaInvalida = limiteMax <= limiteMin;
  const passo = faixaInvalida ? 1 : Math.max(1, Math.round((limiteMax - limiteMin) / 100));

  function commit(min: number, max: number) {
    const minFinal = Math.min(min, max);
    const maxFinal = Math.max(min, max);
    setRascunhoMin(minFinal);
    setRascunhoMax(maxFinal);
    onChangeCommitted(minFinal, maxFinal);
  }

  if (faixaInvalida) {
    return (
      <p className="text-[12px] text-muted">
        Só um preço no recorte atual ({formatarMoeda(limiteMin)}) — nada pra filtrar por faixa.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between text-[12px] font-semibold text-navy">
        <span>{formatarMoeda(rascunhoMin)}</span>
        <span>{formatarMoeda(rascunhoMax)}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-blue"
          style={{
            left: `${((rascunhoMin - limiteMin) / (limiteMax - limiteMin)) * 100}%`,
            right: `${100 - ((rascunhoMax - limiteMin) / (limiteMax - limiteMin)) * 100}%`,
          }}
        />
        <input
          id={`${idBase}-min`}
          type="range"
          aria-label="Preço mínimo"
          min={limiteMin}
          max={limiteMax}
          step={passo}
          value={rascunhoMin}
          onChange={(e) => setRascunhoMin(Math.min(Number(e.target.value), rascunhoMax))}
          onMouseUp={() => commit(rascunhoMin, rascunhoMax)}
          onTouchEnd={() => commit(rascunhoMin, rascunhoMax)}
          onKeyUp={() => commit(rascunhoMin, rascunhoMax)}
          className="range-thumb-only pointer-events-none absolute inset-x-0 top-1/2 w-full -translate-y-1/2 appearance-none bg-transparent"
        />
        <input
          id={`${idBase}-max`}
          type="range"
          aria-label="Preço máximo"
          min={limiteMin}
          max={limiteMax}
          step={passo}
          value={rascunhoMax}
          onChange={(e) => setRascunhoMax(Math.max(Number(e.target.value), rascunhoMin))}
          onMouseUp={() => commit(rascunhoMin, rascunhoMax)}
          onTouchEnd={() => commit(rascunhoMin, rascunhoMax)}
          onKeyUp={() => commit(rascunhoMin, rascunhoMax)}
          className="range-thumb-only pointer-events-none absolute inset-x-0 top-1/2 w-full -translate-y-1/2 appearance-none bg-transparent"
        />
      </div>
    </div>
  );
}
