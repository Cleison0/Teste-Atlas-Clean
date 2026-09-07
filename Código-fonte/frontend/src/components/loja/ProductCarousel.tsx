'use client';

import { useRef } from 'react';
import { ProductCard } from './ProductCard';
import type { Produto } from '@/lib/produtos';

const PASSO_ROLAGEM_PX = 460;

export interface ProductCarouselProps {
  produtos: Produto[];
  /** Rótulo pro grupo de setas — ex: "produtos em Novidades". */
  rotulo: string;
}

// Carrossel de produto NÃO tem autoplay de propósito: diferente do banner e do
// carrossel de marcas (puramente decorativos/navegação), aqui cada card tem um botão
// "Adicionar" — o conteúdo se mexer sozinho embaixo do cursor/foco do usuário nesse
// contexto é um problema de usabilidade, não só de acessibilidade.
export function ProductCarousel({ produtos, rotulo }: ProductCarouselProps) {
  const trilhaRef = useRef<HTMLDivElement>(null);

  function rolar(direcao: 1 | -1) {
    trilhaRef.current?.scrollBy({ left: direcao * PASSO_ROLAGEM_PX, behavior: 'smooth' });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Ver ${rotulo} anteriores`}
        onClick={() => rolar(-1)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-lg font-bold text-navy shadow-atlas-lg hover:bg-sky nav:flex hidden"
      >
        ‹
      </button>

      <div
        ref={trilhaRef}
        className="flex snap-x snap-mandatory gap-[18px] overflow-x-auto scroll-smooth py-1 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {produtos.map((produto, indice) => (
          <div key={produto.id} className="w-[220px] shrink-0 snap-start">
            <ProductCard produto={produto} indice={indice} />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label={`Ver próximos ${rotulo}`}
        onClick={() => rolar(1)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-lg font-bold text-navy shadow-atlas-lg hover:bg-sky nav:flex hidden"
      >
        ›
      </button>
    </div>
  );
}
