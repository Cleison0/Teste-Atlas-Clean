import { Injectable } from '@nestjs/common';
import { RegraAtacado } from '../domain/regra-atacado.entity';
import {
  DadosCriacaoRegraAtacado,
  RegraAtacadoRepository,
} from '../domain/regra-atacado.repository';

@Injectable()
export class CriarRegraAtacadoUseCase {
  constructor(private readonly regraAtacadoRepository: RegraAtacadoRepository) {}

  async executar(dados: DadosCriacaoRegraAtacado): Promise<RegraAtacado> {
    // Valida ANTES de escrever no banco — nunca persiste uma combinação inválida
    // pra só falhar ao reconstruir o domínio depois (mesmo padrão de CriarCupomUseCase).
    RegraAtacado.validarAlvo(dados.produtoId, dados.categoriaId);
    RegraAtacado.validarQuantidadeETipoValor(
      dados.quantidadeMinima,
      dados.tipoDesconto,
      dados.valor,
    );

    return this.regraAtacadoRepository.criar(dados);
  }
}
