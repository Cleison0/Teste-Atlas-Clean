import { Module } from '@nestjs/common';
import { RegraAtacadoRepository } from '../domain/regra-atacado.repository';
import { PrismaRegraAtacadoRepository } from './prisma-regra-atacado.repository';
import { CalcularDescontoAtacadoUseCase } from '../application/calcular-desconto-atacado.use-case';
import { ListarRegrasAtacadoUseCase } from '../application/listar-regras-atacado.use-case';
import { CriarRegraAtacadoUseCase } from '../application/criar-regra-atacado.use-case';
import { AtualizarRegraAtacadoUseCase } from '../application/atualizar-regra-atacado.use-case';
import { RegrasAtacadoController } from '../presentation/regras-atacado.controller';

@Module({
  controllers: [RegrasAtacadoController],
  providers: [
    { provide: RegraAtacadoRepository, useClass: PrismaRegraAtacadoRepository },
    CalcularDescontoAtacadoUseCase,
    ListarRegrasAtacadoUseCase,
    CriarRegraAtacadoUseCase,
    AtualizarRegraAtacadoUseCase,
  ],
  exports: [CalcularDescontoAtacadoUseCase],
})
export class AtacadoModule {}
