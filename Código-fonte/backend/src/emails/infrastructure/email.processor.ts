import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProcessarEmailUseCase } from '../application/processar-email.use-case';
import { TarefaEmail } from '../domain/tarefa-email';
import { FILA_EMAILS } from './emails.constants';

const INTERVALO_LOG_ERRO_CONEXAO_MS = 30_000;

@Processor(FILA_EMAILS)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private ultimoLogErroConexao = 0;

  constructor(private readonly processarEmailUseCase: ProcessarEmailUseCase) {
    super();
  }

  async process(job: Job<TarefaEmail>): Promise<void> {
    await this.processarEmailUseCase.executar(job.data);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<TarefaEmail>, erro: Error): void {
    this.logger.error(
      `Falha ao processar e-mail ${job.data.tipo} (tentativa ${job.attemptsMade}/${job.opts?.attempts}): ${erro.message}`,
    );
  }

  // BullMQ força maxRetriesPerRequest=null na conexão de bloqueio do worker (é
  // requisito da própria lib pra comandos bloqueantes) — sem Redis, isso reconecta
  // e emite 'error' indefinidamente. Sem este listener o processo despeja o
  // AggregateError cru no console a cada tentativa; com o listener, throttla pra
  // um log a cada 30s em vez de silenciar completamente (Redis fora do ar continua
  // visível nos logs, só não afoga o terminal).
  @OnWorkerEvent('error')
  onErro(erro: Error): void {
    const agora = Date.now();
    if (agora - this.ultimoLogErroConexao < INTERVALO_LOG_ERRO_CONEXAO_MS) {
      return;
    }
    this.ultimoLogErroConexao = agora;
    this.logger.warn(`Worker de e-mails sem conexão com o Redis: ${erro.message || erro}`);
  }
}
