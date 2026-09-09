-- Idempotência de e-mails transacionais: um (tipo, pedido) só pode ser registrado
-- uma vez, é o que impede reenvio se o gatilho disparar mais de uma vez (ex.: webhook
-- reentregue). Recuperação de senha não usa essa tabela (cada solicitação é legítima).
CREATE TYPE "TipoEmail" AS ENUM ('CONFIRMACAO_PEDIDO', 'PAGAMENTO_APROVADO', 'PEDIDO_ENVIADO');

CREATE TABLE "emails_enviados" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEmail" NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_enviados_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "emails_enviados_tipo_pedido_id_key" ON "emails_enviados"("tipo", "pedido_id");

ALTER TABLE "emails_enviados" ADD CONSTRAINT "emails_enviados_pedido_id_fkey"
  FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
