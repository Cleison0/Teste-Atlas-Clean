import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { TipoDesconto } from '../../../cupons/domain/cupom.entity';

// Sem produtoId/categoriaId de propósito — ver comentário em AtualizarRegraAtacadoUseCase.
export class AtualizarRegraAtacadoDto {
  @ApiPropertyOptional({ example: 12, minimum: 2 })
  @IsOptional()
  @IsInt()
  @Min(2)
  quantidadeMinima?: number;

  @ApiPropertyOptional({ enum: ['PERCENTUAL', 'VALOR_FIXO'] })
  @IsOptional()
  @IsIn(['PERCENTUAL', 'VALOR_FIXO'])
  tipoDesconto?: TipoDesconto;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
