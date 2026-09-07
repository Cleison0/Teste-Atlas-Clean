-- Preço promocional opcional. NULL = sem promoção ativa. A invariante
-- (preco_promocional < preco) é garantida na aplicação, não no banco.
ALTER TABLE "produtos" ADD COLUMN "preco_promocional" DECIMAL(10,2);
