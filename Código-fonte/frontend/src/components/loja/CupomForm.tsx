'use client';

import { FormEvent, useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { ApiError } from '@/lib/http';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

// Cupom é real no backend (POST/DELETE /carrinho/cupom) — não é placeholder. A UI só
// não existia em lugar nenhum ainda; as funções aplicarCupom/removerCupom já
// estavam prontas no CartContext, sem nenhum formulário usando elas.
export function CupomForm() {
  const { cupomCodigo, desconto, aplicarCupom, removerCupom } = useCart();
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoAplicar(evento: FormEvent) {
    evento.preventDefault();
    if (!codigo.trim()) return;
    setErro(null);
    setEnviando(true);
    try {
      await aplicarCupom(codigo.trim());
      setCodigo('');
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível aplicar esse cupom.');
    } finally {
      setEnviando(false);
    }
  }

  async function aoRemover() {
    setErro(null);
    setEnviando(true);
    try {
      await removerCupom();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível remover o cupom.');
    } finally {
      setEnviando(false);
    }
  }

  if (cupomCodigo) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-atlas-sm border border-green/30 bg-green/5 px-3.5 py-2.5">
        <p className="text-[13px] text-navy">
          Cupom <span className="font-mono font-bold">{cupomCodigo}</span> aplicado
          {desconto > 0 && (
            <span className="text-green">
              {' '}
              — economia de{' '}
              {desconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={aoRemover}
          disabled={enviando}
          className="shrink-0 text-[12.5px] font-semibold text-muted hover:text-red-600 disabled:opacity-50"
        >
          Remover
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={aoAplicar} className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label="Cupom de desconto"
            placeholder="Ex: BEMVINDO10"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={!codigo.trim() || enviando}>
          {enviando ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      {erro && <p className="text-[12px] text-red-500">{erro}</p>}
    </form>
  );
}
