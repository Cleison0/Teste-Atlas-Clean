import { Injectable } from '@nestjs/common';
import { RegraAtacado } from '../domain/regra-atacado.entity';
import { RegraAtacadoRepository } from '../domain/regra-atacado.repository';

@Injectable()
export class ListarRegrasAtacadoUseCase {
  constructor(private readonly regraAtacadoRepository: RegraAtacadoRepository) {}

  executar(): Promise<RegraAtacado[]> {
    return this.regraAtacadoRepository.listarTodas();
  }
}
