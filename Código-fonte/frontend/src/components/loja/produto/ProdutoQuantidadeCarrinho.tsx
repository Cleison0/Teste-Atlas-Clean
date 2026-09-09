'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/http';
import { Stepper } from '@/components/ui/Stepper';

export interface ProdutoQuantidadeCarrinhoProps {
  produtoId: string;
  estoque: number;
  /** Controlado pelo pai — a mesma quantidade alimenta o calculador de frete
   * (ProdutoFrete), então não pode ser estado só interno deste componente. */
  quantidade: number;
  aoMudarQuantidade: (quantidade: number) => void;
}

// O decremento de estoque no backend já é atômico e testado sob concorrência (card
// "Controle de estoque" concluído) — `estoque <= 0` aqui é um dado confiável, não um
// palpite. Mesmo assim, entre o carregamento desta página e o clique em "adicionar"
// alguém mais pode ter levado o último item; o catch abaixo cobre exatamente esse
// caso (a API recusa e devolve mensagem clara, em vez de falha silenciosa).
export function ProdutoQuantidadeCarrinho({
  produtoId,
  estoque,
  quantidade,
  aoMudarQuantidade,
}: ProdutoQuantidadeCarrinhoProps) {
  const { itens, adicionar, atualizarQuantidade } = useCart();
  const { showToast } = useToast();
  const [enviando, setEnviando] = useState(false);

  const noCarrinho = itens.find((item) => item.produtoId === produtoId);
  const semEstoque = estoque <= 0;

  async function aoAdicionar() {
    setEnviando(true);
    try {
      await adicionar(produtoId, quantidade);
      showToast(
        quantidade > 1
          ? `${quantidade} unidades adicionadas ao carrinho.`
          : 'Adicionado ao carrinho.',
        'success',
      );
      aoMudarQuantidade(1);
    } catch (erro) {
      showToast(
        erro instanceof ApiError
          ? erro.message
          : 'Não foi possível adicionar ao carrinho agora. Tente de novo.',
        'error',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (noCarrinho) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted">Já no carrinho:</span>
        <Stepper
          quantidade={noCarrinho.quantidade}
          onChange={(q) => atualizarQuantidade(produtoId, q)}
        />
      </div>
    );
  }

  if (semEstoque) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-atlas-sm bg-line px-5 py-3 text-[14px] font-semibold text-muted"
      >
        Indisponível
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center gap-2.5 rounded-atlas-sm border border-line bg-white px-1.5 py-1">
        <button
          type="button"
          onClick={() => aoMudarQuantidade(Math.max(1, quantidade - 1))}
          disabled={quantidade <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-atlas-sm text-navy hover:bg-sky disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Diminuir quantidade"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={estoque}
          value={quantidade}
          onChange={(e) => {
            const valor = Number(e.target.value);
            if (Number.isFinite(valor)) aoMudarQuantidade(Math.min(Math.max(1, valor), estoque));
          }}
          className="w-10 border-0 bg-transparent text-center text-[14px] font-semibold text-ink focus:outline-none"
          aria-label="Quantidade"
        />
        <button
          type="button"
          onClick={() => aoMudarQuantidade(Math.min(estoque, quantidade + 1))}
          disabled={quantidade >= estoque}
          className="flex h-8 w-8 items-center justify-center rounded-atlas-sm text-navy hover:bg-sky disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={aoAdicionar}
        disabled={enviando}
        className="flex-1 rounded-atlas-sm bg-navy px-5 py-3 text-[14px] font-semibold text-white hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? 'Adicionando…' : '+ Adicionar ao carrinho'}
      </button>
    </div>
  );
}
