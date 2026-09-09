import { Injectable } from '@nestjs/common';
import { ClienteRepository } from '../../domain/cliente.repository';
import { TokenRecuperacaoSenhaRepository } from '../../domain/token-recuperacao-senha.repository';
import { EmailQueuePort } from '../../../emails/domain/email-queue.port';
import { gerarTokenOpaco } from '../../../shared/token.util';

const EXPIRACAO_TOKEN_MINUTOS = 60;

@Injectable()
export class SolicitarRecuperacaoSenhaUseCase {
  constructor(
    private readonly clienteRepository: ClienteRepository,
    private readonly tokenRepository: TokenRecuperacaoSenhaRepository,
    private readonly emailQueue: EmailQueuePort,
  ) {}

  // Sempre "sucede" do ponto de vista do chamador (controller sempre devolve 200,
  // mesmo se o e-mail não existir) — não revela se um e-mail está cadastrado.
  async executar(email: string): Promise<void> {
    const cliente = await this.clienteRepository.buscarPorEmail(email);
    if (!cliente || !cliente.possuiSenha()) {
      // Cliente inexistente ou sem conta (só checkout de convidado) — mesmo
      // resultado "silencioso" nos dois casos.
      return;
    }

    await this.tokenRepository.invalidarValidosDoCliente(cliente.id);

    const { valor, hash } = gerarTokenOpaco();
    const expiraEm = new Date();
    expiraEm.setMinutes(expiraEm.getMinutes() + EXPIRACAO_TOKEN_MINUTOS);
    await this.tokenRepository.criar({ clienteId: cliente.id, tokenHash: hash, expiraEm });

    await this.emailQueue.enfileirar({
      tipo: 'RECUPERACAO_SENHA',
      // Usa o `email` recebido (mesmo valor de cliente.email — só que sem o `?`
      // do tipo da entidade) já que buscarPorEmail(email) só devolve esse cliente
      // se o e-mail bater.
      destinatario: email,
      nomeCliente: cliente.nome,
      token: valor,
    });
  }
}
