import { Module } from '@nestjs/common';
import { RegraAtacadoRepository } from '../domain/regra-atacado.repository';
import { PrismaRegraAtacadoRepository } from './prisma-regra-atacado.repository';
import { CalcularDescontoAtacadoUseCase } from '../application/calcular-desconto-atacado.use-case';

@Module({
  providers: [
    { provide: RegraAtacadoRepository, useClass: PrismaRegraAtacadoRepository },
    CalcularDescontoAtacadoUseCase,
  ],
  exports: [CalcularDescontoAtacadoUseCase],
})
export class AtacadoModule {}
