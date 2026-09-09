import { TarefaEmail } from './tarefa-email';

/**
 * Porta de enfileiramento — a aplicação (use cases de Pedidos/Pagamentos/Clientes)
 * depende só disso, nunca de BullMQ/Redis diretamente. Implementação real fica em
 * infrastructure (BullmqEmailQueueAdapter); quem chama nunca espera o e-mail
 * terminar de enviar, só que o job foi aceito na fila.
 *
 * `enfileirar` nunca lança — falha ao enfileirar (ex.: Redis fora do ar) é logada e
 * engolida pela própria implementação, porque nenhum fluxo crítico (criar pedido,
 * confirmar pagamento) pode falhar por causa de e-mail.
 */
export abstract class EmailQueuePort {
  abstract enfileirar(tarefa: TarefaEmail): Promise<void>;
}
