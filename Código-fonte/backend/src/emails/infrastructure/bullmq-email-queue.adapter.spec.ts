import { Queue } from 'bullmq';
import { BullmqEmailQueueAdapter } from './bullmq-email-queue.adapter';

function criarFilaMock(): jest.Mocked<Queue> {
  return {
    add: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  } as unknown as jest.Mocked<Queue>;
}

describe('BullmqEmailQueueAdapter', () => {
  it('enfileira a tarefa na fila com nome do job = tipo e política de retry configurada', async () => {
    const fila = criarFilaMock();
    const adapter = new BullmqEmailQueueAdapter(fila);

    await adapter.enfileirar({ tipo: 'CONFIRMACAO_PEDIDO', pedidoId: 'pedido-1' });

    expect(fila.add).toHaveBeenCalledWith(
      'CONFIRMACAO_PEDIDO',
      { tipo: 'CONFIRMACAO_PEDIDO', pedidoId: 'pedido-1' },
      expect.objectContaining({ attempts: 3 }),
    );
  });

  // Requisito de negócio: um pedido criado/pago não pode falhar porque o Redis
  // caiu — enfileirar precisa engolir o erro, nunca propagar (ver EmailQueuePort).
  it('nunca lança, mesmo quando a fila (Redis) falha', async () => {
    const fila = criarFilaMock();
    fila.add.mockRejectedValue(new Error('ECONNREFUSED'));
    const adapter = new BullmqEmailQueueAdapter(fila);

    await expect(
      adapter.enfileirar({ tipo: 'PAGAMENTO_APROVADO', pedidoId: 'pedido-1' }),
    ).resolves.toBeUndefined();
  });

  // Sem Redis, o cliente da fila reconecta e emite 'error' indefinidamente — o
  // adapter precisa registrar um listener (senão o processo despeja o erro cru no
  // console a cada tentativa de reconexão).
  it('registra um listener de erro na fila na construção', () => {
    const fila = criarFilaMock();
    new BullmqEmailQueueAdapter(fila);

    expect(fila.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
