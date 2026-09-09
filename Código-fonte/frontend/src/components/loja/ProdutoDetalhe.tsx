'use client';

import { useState } from 'react';
import { BackButton } from './BackButton';
import { PrecoProduto } from './PrecoProduto';
import { ProdutoGaleria } from './produto/ProdutoGaleria';
import { ProdutoQuantidadeCarrinho } from './produto/ProdutoQuantidadeCarrinho';
import { ProdutoFrete } from './produto/ProdutoFrete';
import { ProdutoSpecs } from './produto/ProdutoSpecs';
import type { Produto } from '@/lib/produtos';

export interface ProdutoDetalheProps {
  variantes: Produto[];
}

// Cada "variante" é uma linha de Produto real (marca/embalagem diferentes do mesmo
// ProdutoTipo) — o seletor abaixo troca qual delas está em foco na página, sem
// navegar (mesma URL/slug pro tipo inteiro, ver schema: ProdutoTipo.slug).
export function ProdutoDetalhe({ variantes }: ProdutoDetalheProps) {
  const [selecionadoId, setSelecionadoId] = useState(variantes[0].id);
  const [quantidade, setQuantidade] = useState(1);

  const selecionado = variantes.find((v) => v.id === selecionadoId) ?? variantes[0];

  // Trocar de variante (marca/embalagem) reseta a quantidade — o estoque disponível
  // muda de uma variante pra outra, então uma quantidade válida na anterior pode
  // estourar o limite da nova.
  function aoTrocarVariante(id: string) {
    setSelecionadoId(id);
    setQuantidade(1);
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-10">
      <BackButton />
      <div className="grid gap-8 nav:grid-cols-2">
        <ProdutoGaleria
          produtoId={selecionado.id}
          nome={selecionado.nome}
          categoria={selecionado.categoria}
          marcaImagemUrl={selecionado.marca?.imagemUrl}
          marcaNome={selecionado.marca?.nome}
        />

        <div>
          {selecionado.categoria && (
            <span className="mb-1 inline-block rounded-atlas-sm bg-sky px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-navy">
              {selecionado.categoria}
            </span>
          )}
          <h1 className="font-display text-2xl font-bold text-navy">
            {selecionado.produtoTipo?.nome ?? selecionado.nome}
          </h1>
          {selecionado.pack && <p className="mt-1 text-[13px] text-muted">{selecionado.pack}</p>}

          {variantes.length > 1 && (
            <label className="mt-5 block text-[13px] font-semibold text-navy">
              Escolha a marca
              <select
                value={selecionadoId}
                onChange={(e) => aoTrocarVariante(e.target.value)}
                className="mt-1.5 w-full rounded-atlas-sm border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-blue/40"
              >
                {variantes.map((variante) => (
                  <option key={variante.id} value={variante.id}>
                    {variante.marca?.nome ?? 'Genérico'} — {variante.pack ?? variante.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-5 flex flex-col gap-4 rounded-atlas border border-line bg-white p-4 shadow-atlas">
            <PrecoProduto
              preco={selecionado.preco}
              precoPromocional={selecionado.precoPromocional}
              tamanho="lg"
            />
            <ProdutoQuantidadeCarrinho
              produtoId={selecionado.id}
              estoque={selecionado.estoque}
              quantidade={quantidade}
              aoMudarQuantidade={setQuantidade}
            />
          </div>

          <div className="mt-4">
            <ProdutoFrete
              quantidade={quantidade}
              valorUnitario={selecionado.precoPromocional ?? selecionado.preco}
            />
          </div>

          <ProdutoSpecs
            descricao={selecionado.descricao}
            infoTecnica={selecionado.produtoTipo?.infoTecnica}
            precaucoes={selecionado.produtoTipo?.precaucoes}
          />
        </div>
      </div>
    </div>
  );
}
