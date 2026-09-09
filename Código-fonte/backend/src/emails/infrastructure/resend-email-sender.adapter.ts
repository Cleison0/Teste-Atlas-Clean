import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailSender, MensagemEmail } from '../domain/email-sender.port';

@Injectable()
export class ResendEmailSenderAdapter extends EmailSender {
  private readonly logger = new Logger(ResendEmailSenderAdapter.name);
  private readonly resend: Resend;
  private readonly remetente: string;

  constructor(configService: ConfigService) {
    super();
    this.resend = new Resend(configService.get<string>('RESEND_API_KEY'));
    this.remetente =
      configService.get<string>('EMAIL_FROM') || 'Atlas Nova Clean <onboarding@resend.dev>';
  }

  async enviar(mensagem: MensagemEmail): Promise<void> {
    const resultado = await this.resend.emails.send({
      from: this.remetente,
      to: mensagem.destinatario,
      subject: mensagem.assunto,
      html: mensagem.html,
    });

    if (resultado.error) {
      throw new Error(`Resend recusou o envio: ${resultado.error.message}`);
    }

    this.logger.log(`E-mail enviado pra ${mensagem.destinatario} (id: ${resultado.data?.id})`);
  }
}
