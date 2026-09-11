import { ReactNode } from 'react';

export interface EmptyStateProps {
  icone?: string;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}

/** Estado vazio genérico — nenhum resultado, carrinho vazio, lista sem itens etc.
 * Reaproveitar em vez de criar um bloco de "nada aqui" ad-hoc por tela. */
export function EmptyState({ icone = '📦', titulo, texto, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-atlas border border-dashed border-line bg-white p-10 text-center">
      <span className="text-4xl" aria-hidden="true">
        {icone}
      </span>
      <p className="font-display text-base font-bold text-navy">{titulo}</p>
      {texto && <p className="max-w-xs text-[13px] text-muted">{texto}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  );
}
