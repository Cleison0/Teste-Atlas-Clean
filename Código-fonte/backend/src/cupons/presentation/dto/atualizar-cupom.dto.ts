import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TipoDesconto } from '../../domain/cupom.entity';

// Sem `codigo` de propósito — ver comentário em AtualizarCupomUseCase.
export class AtualizarCupomDto {
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

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validoAte?: Date;

  @ApiPropertyOptional({ example: 100, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usoMaximo?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMinimoPedido?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limiteUsoPorCliente?: number;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Quando enviado (mesmo array vazio), SUBSTITUI o conjunto de categorias restritas inteiro.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  categoriaIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Quando enviado (mesmo array vazio), SUBSTITUI o conjunto de produtos restritos inteiro.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  produtoIds?: string[];
}
