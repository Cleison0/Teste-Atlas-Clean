/** Mensagem já renderizada, pronta pra ir pro provedor — a camada que implementa
 * esse port não sabe (nem precisa saber) qual template gerou o HTML. */
export interface MensagemEmail {
  destinatario: string;
  assunto: string;
  html: string;
}

/**
 * Porta de envio de e-mail — mesmo padrão do PaymentGateway em pagamentos/domain:
 * a aplicação depende só desta abstração, quem implementa (Resend, SMTP, ou um
 * adapter nulo pra dev sem provedor configurado) é detalhe de infraestrutura.
 * Trocar de provedor no futuro não exige mexer em nenhum use case.
 */
export abstract class EmailSender {
  abstract enviar(mensagem: MensagemEmail): Promise<void>;
}
