import { Cupom } from './cupom.entity';
import { ContextoValidacaoCupom, ValidadorDeCupom } from './validador-de-cupom';
import {
  CupomEsgotadoException,
  CupomExpiradoException,
  CupomInativoException,
  CupomLimiteUsoClienteExcedidoException,
  CupomNaoAplicavelItensException,
  CupomValorMinimoNaoAtingidoException,
} from './cupons.exceptions';

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

const CONTEXTO_OK: ContextoValidacaoCupom = {
  subtotalCarrinho: 100,
  temItemElegivel: true,
  usosClienteAtual: 0,
};

describe('ValidadorDeCupom', () => {
  it('não lança nada para um cupom válido num carrinho que satisfaz todas as condições', () => {
    expect(() => ValidadorDeCupom.validar(criarCupom(), CONTEXTO_OK)).not.toThrow();
  });

  it('lança CupomInativoException quando o cupom está inativo', () => {
    expect(() => ValidadorDeCupom.validar(criarCupom({ ativo: false }), CONTEXTO_OK)).toThrow(
      CupomInativoException,
    );
  });

  it('lança CupomExpiradoException quando o cupom expirou', () => {
    const cupom = criarCupom({ validoAte: new Date('2020-01-01') });
    expect(() => ValidadorDeCupom.validar(cupom, CONTEXTO_OK)).toThrow(CupomExpiradoException);
  });

  it('lança CupomEsgotadoException quando o limite global foi atingido', () => {
    const cupom = criarCupom({ usoMaximo: 5, usosCount: 5 });
    expect(() => ValidadorDeCupom.validar(cupom, CONTEXTO_OK)).toThrow(CupomEsgotadoException);
  });

  it('lança CupomValorMinimoNaoAtingidoException quando o subtotal do carrinho fica abaixo do mínimo', () => {
    const cupom = criarCupom({ valorMinimoPedido: 200 });
    expect(() =>
      ValidadorDeCupom.validar(cupom, { ...CONTEXTO_OK, subtotalCarrinho: 199.99 }),
    ).toThrow(CupomValorMinimoNaoAtingidoException);
  });

  it('não lança quando o subtotal é exatamente igual ao mínimo exigido', () => {
    const cupom = criarCupom({ valorMinimoPedido: 100 });
    expect(() =>
      ValidadorDeCupom.validar(cupom, { ...CONTEXTO_OK, subtotalCarrinho: 100 }),
    ).not.toThrow();
  });

  it('lança CupomNaoAplicavelItensException quando o cupom tem restrição e nenhum item do carrinho é elegível', () => {
    const cupom = criarCupom({ produtosRestritos: ['produto-x'] });
    expect(() =>
      ValidadorDeCupom.validar(cupom, { ...CONTEXTO_OK, temItemElegivel: false }),
    ).toThrow(CupomNaoAplicavelItensException);
  });

  it('não checa elegibilidade de itens quando o cupom não tem nenhuma restrição', () => {
    const cupom = criarCupom(); // sem categoriasRestritas/produtosRestritos
    expect(() =>
      ValidadorDeCupom.validar(cupom, { ...CONTEXTO_OK, temItemElegivel: false }),
    ).not.toThrow();
  });

  it('lança CupomLimiteUsoClienteExcedidoException quando o cliente já atingiu o limite por cliente', () => {
    const cupom = criarCupom({ limiteUsoPorCliente: 2 });
    expect(() => ValidadorDeCupom.validar(cupom, { ...CONTEXTO_OK, usosClienteAtual: 2 })).toThrow(
      CupomLimiteUsoClienteExcedidoException,
    );
  });

  it('não checa limiteUsoPorCliente quando o cupom não define esse limite', () => {
    const cupom = criarCupom();
    expect(() =>
      ValidadorDeCupom.validar(cupom, { ...CONTEXTO_OK, usosClienteAtual: 9999 }),
    ).not.toThrow();
  });

  it('lança pela PRIMEIRA condição que falha, na ordem: inativo antes de expirado', () => {
    const cupom = criarCupom({ ativo: false, validoAte: new Date('2020-01-01') });
    expect(() => ValidadorDeCupom.validar(cupom, CONTEXTO_OK)).toThrow(CupomInativoException);
  });
});
