import { Produto } from './produto.entity';

function criarProduto(overrides: Partial<Produto> = {}): Produto {
  return new Produto(
    overrides.id ?? 'produto-1',
    overrides.nome ?? 'Detergente',
    overrides.slug ?? 'detergente',
    overrides.preco ?? 20,
    overrides.estoque ?? 10,
    overrides.ativo ?? true,
    overrides.descricao,
    overrides.categoria,
    overrides.createdAt,
    overrides.updatedAt,
    overrides.pesoKg,
    overrides.alturaCm,
    overrides.larguraCm,
    overrides.comprimentoCm,
    overrides.pack,
    overrides.marca,
    overrides.produtoTipo,
    overrides.precoPromocional,
  );
}

describe('Produto', () => {
  describe('possuiEstoqueDisponivel', () => {
    it('true quando o estoque cobre a quantidade pedida', () => {
      expect(criarProduto({ estoque: 5 }).possuiEstoqueDisponivel(5)).toBe(true);
    });

    it('false quando a quantidade pedida excede o estoque', () => {
      expect(criarProduto({ estoque: 4 }).possuiEstoqueDisponivel(5)).toBe(false);
    });
  });

  describe('estaEmPromocao', () => {
    it('false sem precoPromocional cadastrado', () => {
      expect(criarProduto().estaEmPromocao()).toBe(false);
    });

    it('true com precoPromocional cadastrado', () => {
      expect(criarProduto({ precoPromocional: 15 }).estaEmPromocao()).toBe(true);
    });
  });

  describe('precoEfetivo', () => {
    it('devolve o preço normal quando não há promoção', () => {
      expect(criarProduto({ preco: 20 }).precoEfetivo()).toBe(20);
    });

    it('devolve o preço promocional quando há promoção ativa', () => {
      expect(criarProduto({ preco: 20, precoPromocional: 15 }).precoEfetivo()).toBe(15);
    });
  });

  describe('ativar/desativar', () => {
    it('preserva precoPromocional ao ativar', () => {
      const produto = criarProduto({ ativo: false, precoPromocional: 15 });
      const ativado = produto.ativar();

      expect(ativado.ativo).toBe(true);
      expect(ativado.precoPromocional).toBe(15);
    });

    it('preserva precoPromocional ao desativar', () => {
      const produto = criarProduto({ ativo: true, precoPromocional: 15 });
      const desativado = produto.desativar();

      expect(desativado.ativo).toBe(false);
      expect(desativado.precoPromocional).toBe(15);
    });
  });
});
