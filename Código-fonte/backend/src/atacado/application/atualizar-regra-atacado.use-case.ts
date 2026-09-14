import { Injectable } from '@nestjs/common';
import { RegraAtacado } from '../domain/regra-atacado.entity';
import {
  DadosAtualizacaoRegraAtacado,
  RegraAtacadoRepository,
} from '../domain/regra-atacado.repository';
import { RegraAtacadoNaoEncontradaException } from '../domain/regra-atacado.exceptions';

/** Não permite editar produtoId/categoriaId de propósito — ver comentário em
 * DadosAtualizacaoRegraAtacado. */
@Injectable()
export class AtualizarRegraAtacadoUseCase {
  constructor(private readonly regraAtacadoRepository: RegraAtacadoRepository) {}

  async executar(id: string, dados: DadosAtualizacaoRegraAtacado): Promise<RegraAtacado> {
    const existente = await this.regraAtacadoRepository.buscarPorId(id);
    if (!existente) {
      throw new RegraAtacadoNaoEncontradaException(id);
    }

    // Valida a combinação RESULTANTE (existente + o que está mudando) — mesmo
    // padrão de AtualizarCupomUseCase.
    RegraAtacado.validarQuantidadeETipoValor(
      dados.quantidadeMinima ?? existente.quantidadeMinima,
      dados.tipoDesconto ?? existente.tipoDesconto,
      dados.valor ?? existente.valor,
    );

    return this.regraAtacadoRepository.atualizar(id, dados);
  }
}
