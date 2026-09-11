import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PedidoRepository } from '../../pedidos/domain/pedido.repository';
import { PrismaPedidoRepository } from '../../pedidos/infrastructure/prisma-pedido.repository';
import { EmailSender } from '../domain/email-sender.port';
import { EmailQueuePort } from '../domain/email-queue.port';
import { EmailEnviadoRepository } from '../domain/email-enviado.repository';
import { ResendEmailSenderAdapter } from './resend-email-sender.adapter';
import { NullEmailSenderAdapter } from './null-email-sender.adapter';
import { BullmqEmailQueueAdapter } from './bullmq-email-queue.adapter';
import { PrismaEmailEnviadoRepository } from './prisma-email-enviado.repository';
import { EmailProcessor } from './email.processor';
import { ProcessarEmailUseCase } from '../application/processar-email.use-case';
import { FILA_EMAILS } from './emails.constants';

// PedidosModule e ClientesModule precisam de EmailQueuePort (pra enfileirar), e
// ProcessarEmailUseCase precisa de PedidoRepository (pra buscar o pedido fresco no
// worker) — importar PedidosModule aqui fecharia um ciclo (Pedidos -> Clientes ->
// Emails -> Pedidos). Em vez de forwardRef, este módulo registra seu próprio
// binding de PedidoRepository (PrismaPedidoRepository só depende de PrismaService,
// que é global) — evita o ciclo sem acoplar os módulos entre si.
@Module({
  imports: [ConfigModule, BullModule.registerQueue({ name: FILA_EMAILS })],
  providers: [
    { provide: PedidoRepository, useClass: PrismaPedidoRepository },
    {
      provide: EmailSender,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('RESEND_API_KEY');
        return apiKey ? new ResendEmailSenderAdapter(configService) : new NullEmailSenderAdapter();
      },
      inject: [ConfigService],
    },
    { provide: EmailQueuePort, useClass: BullmqEmailQueueAdapter },
    { provide: EmailEnviadoRepository, useClass: PrismaEmailEnviadoRepository },
    ProcessarEmailUseCase,
    EmailProcessor,
  ],
  exports: [EmailQueuePort],
})
export class EmailsModule {}
