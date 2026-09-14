import { RegraAtacado } from './regra-atacado.entity';

function criarRegra(overrides: Partial<RegraAtacado> = {}): RegraAtacado {
  // produtoId/categoriaId são mutuamente exclusivos — sem nenhum dos dois nos
  // overrides, o default é produtoId; explicitar QUALQUER um dos dois (mesmo como
  // undefined) desliga o default do outro, senão os dois acabam preenchidos juntos.
  const semRestricaoExplicita = !('produtoId' in overrides) && !('categoriaId' in overrides);
  return new RegraAtacado(
    overrides.id ?? 'regra-1',
    overrides.quantidadeMinima ?? 12,
    overrides.tipoDesconto ?? 'PERCENTUAL',
    overrides.valor ?? 10,
    overrides.ativo ?? true,
    overrides.createdAt ?? new Date(),
    semRestricaoExplicita ? 'produto-1' : overrides.produtoId,
    overrides.categoriaId,
  );
}

describe('RegraAtacado — construção', () => {
  it('rejeita quando nem produtoId nem categoriaId são informados', () => {
    expect(
      () =>
        new RegraAtacado('regra-1', 12, 'PERCENTUAL', 10, true, new Date(), undefined, undefined),
    ).toThrow();
  });

  it('rejeita quando os dois (produtoId e categoriaId) são informados juntos', () => {
    expect(
      () =>
        new RegraAtacado('regra-1', 12, 'PERCENTUAL', 10, true, new Date(), 'produto-1', 'cat-1'),
    ).toThrow();
  });

  it('rejeita quantidadeMinima menor que 2', () => {
    expect(() => criarRegra({ quantidadeMinima: 1 })).toThrow();
  });

  it('rejeita PERCENTUAL fora de 0-100', () => {
    expect(() => criarRegra({ tipoDesconto: 'PERCENTUAL', valor: 101 })).toThrow();
  });

  it('rejeita VALOR_FIXO negativo', () => {
    expect(() => criarRegra({ tipoDesconto: 'VALOR_FIXO', valor: -1 })).toThrow();
  });
});

describe('RegraAtacado.aplicavelA', () => {
  it('não se aplica quando a quantidade é menor que quantidadeMinima', () => {
    const regra = criarRegra({ produtoId: 'produto-1', quantidadeMinima: 12 });
    expect(regra.aplicavelA('produto-1', undefined, 11)).toBe(false);
  });

  it('se aplica quando a quantidade atinge exatamente quantidadeMinima', () => {
    const regra = criarRegra({ produtoId: 'produto-1', quantidadeMinima: 12 });
    expect(regra.aplicavelA('produto-1', undefined, 12)).toBe(true);
  });

  it('regra por produto não se aplica a outro produto, mesmo com quantidade suficiente', () => {
    const regra = criarRegra({ produtoId: 'produto-1', quantidadeMinima: 12 });
    expect(regra.aplicavelA('produto-2', undefined, 12)).toBe(false);
  });

  it('regra por categoria se aplica a qualquer produto daquela categoria', () => {
    const regra = criarRegra({
      produtoId: undefined,
      categoriaId: 'cat-limpeza',
      quantidadeMinima: 12,
    });
    expect(regra.aplicavelA('produto-qualquer', 'cat-limpeza', 12)).toBe(true);
    expect(regra.aplicavelA('produto-qualquer', 'cat-outra', 12)).toBe(false);
    expect(regra.aplicavelA('produto-qualquer', undefined, 12)).toBe(false);
  });
});

describe('RegraAtacado.calcularDesconto', () => {
  it('PERCENTUAL calcula a porcentagem do subtotal do item', () => {
    const regra = criarRegra({ tipoDesconto: 'PERCENTUAL', valor: 10 });
    expect(regra.calcularDesconto(120)).toBe(12);
  });

  it('VALOR_FIXO nunca excede o subtotal do item', () => {
    const regra = criarRegra({ tipoDesconto: 'VALOR_FIXO', valor: 50 });
    expect(regra.calcularDesconto(30)).toBe(30);
  });
});
