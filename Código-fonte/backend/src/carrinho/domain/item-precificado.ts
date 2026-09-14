export class ItemPrecificado {
  constructor(
    public readonly produtoId: string,
    public readonly nome: string,
    public readonly quantidade: number,
    public readonly precoUnitario: number,
    public readonly pesoKg?: number,
    public readonly alturaCm?: number,
    public readonly larguraCm?: number,
    public readonly comprimentoCm?: number,
    /** Usado só pra elegibilidade de restrição de cupom/atacado por categoria
     * (ver Cupom.ehElegivel, RegraAtacado.aplicavelA) — nunca exibido ao cliente. */
    public readonly categoriaId?: string,
    /** 0 quando nenhuma regra de atacado se aplica a este item. Já descontado do
     * catálogo (RegraAtacado.calcularDesconto) — ver Carrinho.descontoAtacado pro
     * agregado do carrinho inteiro. */
    public readonly descontoAtacado: number = 0,
  ) {}

  get subtotal(): number {
    return Number((this.precoUnitario * this.quantidade).toFixed(2));
  }

  /** subtotal já líquido do desconto de atacado deste item — é isso que entra na
   * base de cálculo de um cupom por código elegível (os dois descontos se somam,
   * não competem — ver ValidadorDeCupom/MontarCarrinhoUseCase). */
  get subtotalLiquidoAtacado(): number {
    return Number((this.subtotal - this.descontoAtacado).toFixed(2));
  }
}

export class Carrinho {
  constructor(
    public readonly itens: ItemPrecificado[],
    /** 0 quando nenhum cupom foi aplicado. Já validado e calculado (ver
     * Cupom.calcularDesconto) sobre o subtotal elegível líquido de atacado — nunca
     * maior que `total - descontoAtacado`. */
    public readonly desconto: number = 0,
    public readonly cupomCodigo?: string,
  ) {}

  /** Soma dos itens pelo preço de catálogo, SEM nenhum desconto — quem precisa do
   * valor final (ex: CriarPedidoUseCase) calcula `total - descontoTotal`
   * explicitamente, pra não esconder essa conta num getter. */
  get total(): number {
    return Number(this.itens.reduce((soma, item) => soma + item.subtotal, 0).toFixed(2));
  }

  /** Soma dos descontos de atacado de todos os itens — separado de `desconto`
   * (que é só o do cupom por código) pra cada um aparecer como linha própria pro
   * cliente ver de onde veio a economia. */
  get descontoAtacado(): number {
    return Number(this.itens.reduce((soma, item) => soma + item.descontoAtacado, 0).toFixed(2));
  }

  /** Os dois descontos juntos — atacado e cupom se somam (nunca competem, ver
   * decisão documentada em ValidadorDeCupom/MontarCarrinhoUseCase). */
  get descontoTotal(): number {
    return Number((this.descontoAtacado + this.desconto).toFixed(2));
  }
}
