import { Injectable } from '@nestjs/common';
import { TipoEmail as TipoEmailPrisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { EmailEnviadoRepository } from '../domain/email-enviado.repository';
import { TipoEmailPedido } from '../domain/tarefa-email';

@Injectable()
export class PrismaEmailEnviadoRepository extends EmailEnviadoRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async jaEnviado(tipo: TipoEmailPedido, pedidoId: string): Promise<boolean> {
    const registro = await this.prisma.emailEnviado.findUnique({
      where: { tipo_pedidoId: { tipo: tipo as TipoEmailPrisma, pedidoId } },
    });
    return registro !== null;
  }

  async registrar(tipo: TipoEmailPedido, pedidoId: string, destinatario: string): Promise<void> {
    await this.prisma.emailEnviado.create({
      data: { tipo: tipo as TipoEmailPrisma, pedidoId, destinatario },
    });
  }
}
