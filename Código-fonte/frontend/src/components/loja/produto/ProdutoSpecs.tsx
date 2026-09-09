export interface ProdutoSpecsProps {
  descricao?: string;
  infoTecnica?: string;
  precaucoes?: string;
}

// Todo texto aqui é dado real vindo da API (Produto.descricao, ProdutoTipo.infoTecnica/
// precaucoes) — nenhum desses campos guarda HTML/rich text no schema atual (são
// colunas de texto puro), então renderizar como texto simples (React já escapa por
// padrão) é suficiente; não há necessidade de sanitizador nem dangerouslySetInnerHTML.
// Nem todo produto/tipo tem os três preenchidos — cada bloco só aparece se tiver
// conteúdo, e a seção inteira some se não houver nenhum dos três.
export function ProdutoSpecs({ descricao, infoTecnica, precaucoes }: ProdutoSpecsProps) {
  if (!descricao && !infoTecnica && !precaucoes) return null;

  return (
    <div className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
      {descricao && (
        <div>
          <h2 className="mb-1 font-display text-sm font-bold text-navy">Descrição</h2>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{descricao}</p>
        </div>
      )}
      {infoTecnica && (
        <div>
          <h2 className="mb-1 font-display text-sm font-bold text-navy">Informações técnicas</h2>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
            {infoTecnica}
          </p>
        </div>
      )}
      {precaucoes && (
        <div>
          <h2 className="mb-1 font-display text-sm font-bold text-navy">Precauções de uso</h2>
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">{precaucoes}</p>
        </div>
      )}
    </div>
  );
}
