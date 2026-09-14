import { TipoDesconto } from '../../cupons/domain/cupom.entity';

/** Desconto automático por faixa de quantidade — sem código, política de preço do
 * produto/categoria, não uma promoção pontual (ver Cupom, que é o outro tipo de
 * desconto, digitado). produtoId e categoriaId são mutuamente exclusivos: exatamente
 * um dos dois é preenchido, nunca os dois nem nenhum — validado no construtor. */
export class RegraAtacado {
  constructor(
    public readonly id: string,
    public readonly quantidadeMinima: number,
    public readonly tipoDesconto: TipoDesconto,
    public readonly valor: number,
    public readonly ativo: boolean,
    public readonly createdAt: Date,
    public readonly produtoId?: string,
    public readonly categoriaId?: string,
  ) {
    if (!!produtoId === !!categoriaId) {
      throw new Error('RegraAtacado precisa de exatamente um entre produtoId e categoriaId.');
    }
    if (quantidadeMinima < 2) {
      throw new Error('RegraAtacado.quantidadeMinima precisa ser pelo menos 2.');
    }
    if (tipoDesconto === 'PERCENTUAL' && (valor < 0 || valor > 100)) {
      throw new Error('RegraAtacado percentual precisa ter valor entre 0 e 100.');
    }
    if (tipoDesconto === 'VALOR_FIXO' && valor < 0) {
      throw new Error('RegraAtacado de valor fixo não pode ter valor negativo.');
    }
  }

  aplicavelA(produtoId: string, categoriaId: string | undefined, quantidade: number): boolean {
    if (quantidade < this.quantidadeMinima) return false;
    if (this.produtoId !== undefined) return this.produtoId === produtoId;
    return categoriaId !== undefined && this.categoriaId === categoriaId;
  }

  /** Desconto sobre o subtotal do ITEM (precoUnitario × quantidade) — não sobre o
   * carrinho inteiro, é uma regra de preço daquele produto especificamente. Mesmo
   * cuidado de nunca passar do subtotal que Cupom.calcularDesconto já tem. */
  calcularDesconto(subtotalItem: number): number {
    const bruto =
      this.tipoDesconto === 'PERCENTUAL' ? subtotalItem * (this.valor / 100) : this.valor;
    return Number(Math.min(bruto, subtotalItem).toFixed(2));
  }
}
