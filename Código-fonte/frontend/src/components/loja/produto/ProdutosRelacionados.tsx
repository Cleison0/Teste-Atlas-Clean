import { listarProdutos } from '@/lib/produtos';
import { ProductCarousel } from '@/components/loja/ProductCarousel';

export interface ProdutosRelacionadosProps {
  categoria?: string;
  /** slug do ProdutoTipo atual — exclui todas as variantes dele, não só o id da
   * variante selecionada. */
  produtoTipoSlugAtual?: string;
}

const QUANTIDADE = 12;
// Preço/estoque/promoção mudam via admin a qualquer momento — revalidate curto,
// mesmo padrão das outras seções de produtos da Home.
const REVALIDATE_SEGUNDOS = 120;

// Não existe endpoint de "produtos relacionados" — deriva da mesma categoria via
// GET /produtos?categoria=..., excluindo as variantes do tipo atual no próprio
// filtro depois de buscar (a API não tem "excluir produtoTipo").
export async function ProdutosRelacionados({
  categoria,
  produtoTipoSlugAtual,
}: ProdutosRelacionadosProps) {
  if (!categoria) return null;

  let relacionados;
  try {
    const resultado = await listarProdutos(
      { pagina: 1, limite: QUANTIDADE + 1, categoria },
      { next: { revalidate: REVALIDATE_SEGUNDOS } },
    );
    relacionados = resultado.itens
      .filter((produto) => produto.produtoTipo?.slug !== produtoTipoSlugAtual)
      .slice(0, QUANTIDADE);
  } catch {
    // Isolado: se a busca de relacionados falhar, some só esse bloco — o resto da
    // página de produto (galeria, preço, adicionar ao carrinho) segue normal.
    return null;
  }

  if (relacionados.length === 0) return null;

  return (
    <section aria-label="Produtos relacionados" className="mt-10 border-t border-line pt-8">
      <h2 className="mb-5 font-display text-lg font-bold text-navy">Você também pode gostar</h2>
      <ProductCarousel produtos={relacionados} rotulo="produtos relacionados" />
    </section>
  );
}
