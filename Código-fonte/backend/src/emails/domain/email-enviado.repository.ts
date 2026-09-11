import { TipoEmailPedido } from './tarefa-email';

/**
 * Guarda de idempotência pros 3 e-mails de pedido (não recuperação de senha — ver
 * TarefaEmail). Constraint única (tipo, pedidoId) no banco é a garantia de verdade
 * contra corrida (dois workers processando o mesmo job por engano, ou o gatilho
 * disparando duas vezes); `jaEnviado` é só uma checagem de leitura rápida antes de
 * gastar a chamada ao provedor.
 */
export abstract class EmailEnviadoRepository {
  abstract jaEnviado(tipo: TipoEmailPedido, pedidoId: string): Promise<boolean>;

  /**
   * Registra o envio. Deve ser chamado só depois do EmailSender confirmar sucesso —
   * se a constraint única do banco rejeitar (corrida entre duas tentativas
   * concorrentes), quem chama trata como "já enviado por outra tentativa", não como erro.
   */
  abstract registrar(tipo: TipoEmailPedido, pedidoId: string, destinatario: string): Promise<void>;
}
