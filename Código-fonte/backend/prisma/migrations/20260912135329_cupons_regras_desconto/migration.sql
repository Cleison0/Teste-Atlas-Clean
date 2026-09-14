-- AlterTable
ALTER TABLE "cupons" ADD COLUMN     "limite_uso_por_cliente" INTEGER,
ADD COLUMN     "valor_minimo_pedido" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "cupons_categorias" (
    "cupom_codigo" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,

    CONSTRAINT "cupons_categorias_pkey" PRIMARY KEY ("cupom_codigo","categoria_id")
);

-- CreateTable
CREATE TABLE "cupons_produtos" (
    "cupom_codigo" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,

    CONSTRAINT "cupons_produtos_pkey" PRIMARY KEY ("cupom_codigo","produto_id")
);

-- CreateTable
CREATE TABLE "cupons_uso_cliente" (
    "cupom_codigo" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "usos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cupons_uso_cliente_pkey" PRIMARY KEY ("cupom_codigo","cliente_id")
);

-- CreateTable
CREATE TABLE "regras_atacado" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT,
    "categoria_id" TEXT,
    "quantidade_minima" INTEGER NOT NULL,
    "tipo_desconto" "TipoDesconto" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regras_atacado_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cupons_categorias" ADD CONSTRAINT "cupons_categorias_cupom_codigo_fkey" FOREIGN KEY ("cupom_codigo") REFERENCES "cupons"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons_categorias" ADD CONSTRAINT "cupons_categorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons_produtos" ADD CONSTRAINT "cupons_produtos_cupom_codigo_fkey" FOREIGN KEY ("cupom_codigo") REFERENCES "cupons"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons_produtos" ADD CONSTRAINT "cupons_produtos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons_uso_cliente" ADD CONSTRAINT "cupons_uso_cliente_cupom_codigo_fkey" FOREIGN KEY ("cupom_codigo") REFERENCES "cupons"("codigo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupons_uso_cliente" ADD CONSTRAINT "cupons_uso_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regras_atacado" ADD CONSTRAINT "regras_atacado_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regras_atacado" ADD CONSTRAINT "regras_atacado_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
