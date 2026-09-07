-- Cupom aplicado ao carrinho persistido (opcional). Validade/uso máximo são
-- reconferidos a cada leitura (VisualizarCarrinhoUseCase), não confia em "era válido
-- quando foi aplicado".
ALTER TABLE "carrinhos" ADD COLUMN "cupom_codigo" TEXT;

-- AddForeignKey
ALTER TABLE "carrinhos" ADD CONSTRAINT "carrinhos_cupom_codigo_fkey" FOREIGN KEY ("cupom_codigo") REFERENCES "cupons"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;
