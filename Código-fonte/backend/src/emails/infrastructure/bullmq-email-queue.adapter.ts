import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EmailQueuePort } from '../domain/email-queue.port';
import { TarefaEmail } from '../domain/tarefa-email';
import { FILA_EMAILS } from './emails.constants';

const INTERVALO_LOG_ERRO_CONEXAO_MS = 30_000;

/**
 * EmailQueuePort nunca deve lançar (é chamada de dentro de use cases após a
 * operação principal já ter sido persistida — um pedido criado não pode falhar
 * porque o Redis caiu). Qualquer erro ao enfileirar é só logado.
 */
@Injectable()
export class BullmqEmailQueueAdapter extends EmailQueuePort {
  private readonly logger = new Logger(BullmqEmailQueueAdapter.name);
  private ultimoLogErroConexao = 0;

  constructor(@InjectQueue(FILA_EMAILS) private readonly fila: Queue<TarefaEmail>) {
    super();
    // Sem Redis, o cliente da fila reconecta e emite 'error' indefinidamente (mesma
    // causa do listener em EmailProcessor, do lado do worker) — sem isto, o processo
    // despeja um AggregateError cru no console a cada tentativa.
    this.fila.on('error', (erro) => {
      const agora = Date.now();
      if (agora - this.ultimoLogErroConexao < INTERVALO_LOG_ERRO_CONEXAO_MS) {
        return;
      }
      this.ultimoLogErroConexao = agora;
      this.logger.warn(`Fila de e-mails sem conexão com o Redis: ${erro.message || erro}`);
    });
  }

  async enfileirar(tarefa: TarefaEmail): Promise<void> {
    try {
      await this.fila.add(tarefa.tipo, tarefa, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: true,
        removeOnFail: 100,
      });
    } catch (erro) {
      this.logger.error(
        `Falha ao enfileirar e-mail do tipo ${tarefa.tipo}: ${(erro as Error).message}`,
      );
    }
  }
}
