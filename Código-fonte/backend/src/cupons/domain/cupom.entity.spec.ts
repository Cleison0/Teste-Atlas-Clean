import { Cupom } from './cupom.entity';
import { CupomValorInvalidoException } from './cupons.exceptions';

function criarCupom(overrides: Partial<Cupom> = {}): Cupom {
  return new Cupom(
    overrides.id ?? 'cupom-1',
    overrides.codigo ?? 'DESCONTO10',
    overrides.tipoDesconto ?? 'PERCENTUAL',
    overrides.valor ?? 10,
    overrides.ativo ?? true,
    overrides.usosCount ?? 0,
    overrides.createdAt ?? new Date(),
    overrides.validoAte,
    overrides.usoMaximo,
    overrides.valorMinimoPedido,
    overrides.limiteUsoPorCliente,
    overrides.categoriasRestritas ?? [],
    overrides.produtosRestritos ?? [],
  );
}

describe('Cupom.estaValido', () => {
  it('é válido por padrão (ativo, sem validade nem limite de uso)', () => {
    expect(criarCupom().estaValido()).toBe(true);
  });

  it('é inválido quando inativo', () => {
    expect(criarCupom({ ativo: false }).estaValido()).toBe(false);
  });

  it('é inválido quando validoAte já passou', () => {
    const cupom = criarCupom({ validoAte: new Date('2020-01-01') });
    expect(cupom.estaValido(new Date('2020-06-01'))).toBe(false);
  });

  it('é válido quando validoAte ainda não chegou', () => {
    const cupom = criarCupom({ validoAte: new Date('2030-01-01') });
    expect(cupom.estaValido(new Date('2026-01-01'))).toBe(true);
  });

  it('é inválido quando usosCount já atingiu usoMaximo', () => {
    expect(criarCupom({ usoMaximo: 5, usosCount: 5 }).estaValido()).toBe(false);
  });

  it('é válido quando usosCount ainda não atingiu usoMaximo', () => {
    expect(criarCupom({ usoMaximo: 5, usosCount: 4 }).estaValido()).toBe(true);
  });
});

describe('Cupom.calcularDesconto', () => {
  it('PERCENTUAL calcula a porcentagem do subtotal', () => {
    const cupom = criarCupom({ tipoDesconto: 'PERCENTUAL', valor: 10 });
    expect(cupom.calcularDesconto(100)).toBe(10);
  });

  it('VALOR_FIXO usa o valor fixo direto quando cabe no subtotal', () => {
    const cupom = criarCupom({ tipoDesconto: 'VALOR_FIXO', valor: 15 });
    expect(cupom.calcularDesconto(100)).toBe(15);
  });

  it('VALOR_FIXO nunca excede o subtotal (evita total negativo)', () => {
    const cupom = criarCupom({ tipoDesconto: 'VALOR_FIXO', valor: 50 });
    expect(cupom.calcularDesconto(20)).toBe(20);
  });

  it('PERCENTUAL de 100% zera o total sem passar dele', () => {
    const cupom = criarCupom({ tipoDesconto: 'PERCENTUAL', valor: 100 });
    expect(cupom.calcularDesconto(35.5)).toBe(35.5);
  });
});

describe('Cupom — validação de valor na construção', () => {
  it('rejeita PERCENTUAL acima de 100', () => {
    expect(() => criarCupom({ tipoDesconto: 'PERCENTUAL', valor: 101 })).toThrow(
      CupomValorInvalidoException,
    );
  });

  it('rejeita PERCENTUAL negativo', () => {
    expect(() => criarCupom({ tipoDesconto: 'PERCENTUAL', valor: -1 })).toThrow(
      CupomValorInvalidoException,
    );
  });

  it('aceita PERCENTUAL nos limites (0 e 100)', () => {
    expect(() => criarCupom({ tipoDesconto: 'PERCENTUAL', valor: 0 })).not.toThrow();
    expect(() => criarCupom({ tipoDesconto: 'PERCENTUAL', valor: 100 })).not.toThrow();
  });

  it('rejeita VALOR_FIXO negativo', () => {
    expect(() => criarCupom({ tipoDesconto: 'VALOR_FIXO', valor: -0.01 })).toThrow(
      CupomValorInvalidoException,
    );
  });

  it('aceita VALOR_FIXO acima de 100 (sem teto pra esse tipo)', () => {
    expect(() => criarCupom({ tipoDesconto: 'VALOR_FIXO', valor: 500 })).not.toThrow();
  });
});

describe('Cupom.ehElegivel', () => {
  it('sem nenhuma restrição cadastrada, todo item é elegível', () => {
    const cupom = criarCupom();
    expect(cupom.ehElegivel('produto-qualquer', 'categoria-qualquer')).toBe(true);
    expect(cupom.ehElegivel('produto-qualquer', undefined)).toBe(true);
  });

  it('com restrição por produto, só o produto listado é elegível', () => {
    const cupom = criarCupom({ produtosRestritos: ['produto-1'] });
    expect(cupom.ehElegivel('produto-1')).toBe(true);
    expect(cupom.ehElegivel('produto-2')).toBe(false);
  });

  it('com restrição por categoria, só itens dessa categoria são elegíveis', () => {
    const cupom = criarCupom({ categoriasRestritas: ['cat-limpeza'] });
    expect(cupom.ehElegivel('produto-1', 'cat-limpeza')).toBe(true);
    expect(cupom.ehElegivel('produto-1', 'cat-papelaria')).toBe(false);
    expect(cupom.ehElegivel('produto-1', undefined)).toBe(false);
  });

  it('categoria OU produto batendo já basta quando o cupom tem os dois tipos de restrição', () => {
    const cupom = criarCupom({
      categoriasRestritas: ['cat-limpeza'],
      produtosRestritos: ['produto-especifico'],
    });
    expect(cupom.ehElegivel('produto-especifico', 'cat-outra')).toBe(true);
    expect(cupom.ehElegivel('produto-qualquer', 'cat-limpeza')).toBe(true);
    expect(cupom.ehElegivel('produto-qualquer', 'cat-outra')).toBe(false);
  });
});

describe('Cupom.estaExpirado / atingiuLimiteGlobal', () => {
  it('estaExpirado é false sem validoAte definido', () => {
    expect(criarCupom().estaExpirado()).toBe(false);
  });

  it('estaExpirado compara contra o momento informado', () => {
    const cupom = criarCupom({ validoAte: new Date('2026-01-01') });
    expect(cupom.estaExpirado(new Date('2025-12-31'))).toBe(false);
    expect(cupom.estaExpirado(new Date('2026-01-02'))).toBe(true);
  });

  it('atingiuLimiteGlobal é false sem usoMaximo definido, mesmo com muitos usos', () => {
    expect(criarCupom({ usosCount: 1000 }).atingiuLimiteGlobal()).toBe(false);
  });

  it('atingiuLimiteGlobal é true quando usosCount alcança usoMaximo', () => {
    expect(criarCupom({ usoMaximo: 3, usosCount: 3 }).atingiuLimiteGlobal()).toBe(true);
    expect(criarCupom({ usoMaximo: 3, usosCount: 2 }).atingiuLimiteGlobal()).toBe(false);
  });
});
