import { Injectable, Logger } from '@nestjs/common';
import { EmailSender, MensagemEmail } from '../domain/email-sender.port';

/**
 * Fallback usado quando RESEND_API_KEY não está configurada (mesmo padrão já
 * existente no fluxo de recuperação de senha antes deste módulo: registra em log
 * em vez de falhar o processamento em dev/CI sem provedor configurado).
 */
@Injectable()
export class NullEmailSenderAdapter extends EmailSender {
  private readonly logger = new Logger(NullEmailSenderAdapter.name);

  async enviar(mensagem: MensagemEmail): Promise<void> {
    this.logger.warn(
      `RESEND_API_KEY não configurada — e-mail "${mensagem.assunto}" para ${mensagem.destinatario} não foi enviado (apenas logado).`,
    );
  }
}
