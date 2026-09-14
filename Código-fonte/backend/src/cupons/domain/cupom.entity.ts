import { CupomValorInvalidoException } from './cupons.exceptions';

export type TipoDesconto = 'PERCENTUAL' | 'VALOR_FIXO';

export class Cupom {
  /** Extraído do construtor pra CriarCupomUseCase/AtualizarCupomUseCase poderem
   * validar ANTES de escrever no banco — sem isso, um valor inválido só falharia
   * ao reconstruir o domínio depois de já ter sido persistido (tarde demais). */
  static validarTipoEValor(tipoDesconto: TipoDesconto, valor: number): void {
    if (tipoDesconto === 'PERCENTUAL' && (valor < 0 || valor > 100)) {
      throw new CupomValorInvalidoException('Cupom percentual precisa ter valor entre 0 e 100.');
    }
    if (tipoDesconto === 'VALOR_FIXO' && valor < 0) {
      throw new CupomValorInvalidoException('Cupom de valor fixo não pode ter valor negativo.');
    }
  }

  constructor(
    public readonly id: string,
    public readonly codigo: string,
    public readonly tipoDesconto: TipoDesconto,
    public readonly valor: number,
    public readonly ativo: boolean,
    public readonly usosCount: number,
    public readonly createdAt: Date,
    public readonly validoAte?: Date,
    public readonly usoMaximo?: number,
    public readonly valorMinimoPedido?: number,
    public readonly limiteUsoPorCliente?: number,
    /** Vazio = sem restrição, aplica ao carrinho inteiro (ver ehElegivel). */
    public readonly categoriasRestritas: readonly string[] = [],
    public readonly produtosRestritos: readonly string[] = [],
  ) {
    Cupom.validarTipoEValor(tipoDesconto, valor);
  }

  estaExpirado(agora: Date = new Date()): boolean {
    return this.validoAte !== undefined && this.validoAte < agora;
  }

  atingiuLimiteGlobal(): boolean {
    return this.usoMaximo !== undefined && this.usosCount >= this.usoMaximo;
  }

  temRestricaoDeItens(): boolean {
    return this.categoriasRestritas.length > 0 || this.produtosRestritos.length > 0;
  }

  /** true quando o cupom pode descontar este item — sem nenhuma restrição
   * cadastrada, todo item é elegível (mantém o comportamento de hoje: desconto
   * sobre o carrinho inteiro). Categoria OU produto batendo já basta. */
  ehElegivel(produtoId: string, categoriaId?: string): boolean {
    if (!this.temRestricaoDeItens()) return true;
    if (this.produtosRestritos.includes(produtoId)) return true;
    return categoriaId !== undefined && this.categoriasRestritas.includes(categoriaId);
  }

  /** Só as condições que dependem exclusivamente do próprio cupom (sem contexto de
   * carrinho/cliente) — mantido pelo mesmo nome de antes das restrições de valor
   * mínimo/categoria/limite por cliente existirem. Usado onde só isso importa
   * (ex.: listagem admin "cupom ainda pode ser usado por alguém, em tese"). Pra
   * decidir se APLICA a um carrinho específico, use ValidadorDeCupom. */
  estaValido(agora: Date = new Date()): boolean {
    return this.ativo && !this.estaExpirado(agora) && !this.atingiuLimiteGlobal();
  }

  /** Nunca deixa o desconto passar do subtotal informado — evita total negativo com
   * cupom VALOR_FIXO maior que a compra (ou que a parte elegível dela, quando
   * restrito por categoria/produto). Quem chama decide qual subtotal usar (ver
   * ValidadorDeCupom/MontarCarrinhoUseCase) — este método não valida nada sozinho. */
  calcularDesconto(subtotalElegivel: number): number {
    const bruto =
      this.tipoDesconto === 'PERCENTUAL' ? subtotalElegivel * (this.valor / 100) : this.valor;
    return Number(Math.min(bruto, subtotalElegivel).toFixed(2));
  }
}
