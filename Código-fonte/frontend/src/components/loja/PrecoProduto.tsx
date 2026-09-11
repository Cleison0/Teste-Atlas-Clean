import { Badge } from '@/components/ui/Badge';

export interface PrecoProdutoProps {
  preco: number;
  precoPromocional?: number;
  /** Tamanho do preço principal — a página de detalhe usa "lg", os cards usam "md". */
  tamanho?: 'md' | 'lg';
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Preço com desconto (riscado + badge de percentual) — mesmo bloco usado no
// ProductCard e na página de detalhe, pra nunca divergir visualmente entre os dois.
export function PrecoProduto({ preco, precoPromocional, tamanho = 'md' }: PrecoProdutoProps) {
  const emPromocao = precoPromocional !== undefined;
  const percentualDesconto = emPromocao ? Math.round((1 - precoPromocional / preco) * 100) : 0;
  const tamanhoPrincipal = tamanho === 'lg' ? 'text-2xl' : 'text-[14px]';
  const tamanhoRiscado = tamanho === 'lg' ? 'text-[14px]' : 'text-[11px]';

  if (!emPromocao) {
    return (
      <span className={`font-mono ${tamanhoPrincipal} font-bold text-navy`}>
        {formatarMoeda(preco)}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="flex flex-col">
        <span className={`font-mono ${tamanhoRiscado} text-muted line-through`}>
          {formatarMoeda(preco)}
        </span>
        <span className={`font-mono ${tamanhoPrincipal} font-bold text-green`}>
          {formatarMoeda(precoPromocional)}
        </span>
      </span>
      <Badge variant="amber">-{percentualDesconto}%</Badge>
    </span>
  );
}
