// Mapeamento visual (cor de fundo + ícone) por slug de categoria — usado nos cards
// de produto, tipo de produto e nos atalhos de categoria da home. Centralizado aqui
// porque antes vivia duplicado em ProductCard e ProductTypeCard.
export const COR_POR_CATEGORIA: Record<string, string> = {
  limpeza: '#EAF4FF',
  descartaveis: '#FFF3E0',
  papelaria: '#EAF7EF',
};

export const ICONE_POR_CATEGORIA: Record<string, string> = {
  limpeza: '🧴',
  descartaveis: '🥤',
  papelaria: '📎',
};

export function corDaCategoria(categoria?: string): string {
  return COR_POR_CATEGORIA[categoria ?? ''] ?? '#EAF4FF';
}

export function iconeDaCategoria(categoria?: string): string {
  return ICONE_POR_CATEGORIA[categoria ?? ''] ?? '🧴';
}
