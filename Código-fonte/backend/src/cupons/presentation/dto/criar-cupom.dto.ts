import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';
import { TipoDesconto } from '../../domain/cupom.entity';

export class CriarCupomDto {
  @ApiProperty({ example: 'BEMVINDO10', maxLength: 30 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  codigo!: string;

  @ApiProperty({ enum: ['PERCENTUAL', 'VALOR_FIXO'] })
  @IsIn(['PERCENTUAL', 'VALOR_FIXO'])
  tipoDesconto!: TipoDesconto;

  @ApiProperty({
    example: 10,
    minimum: 0,
    description:
      '% se PERCENTUAL (0 a 100), R$ se VALOR_FIXO (sem limite superior aqui — a checagem de 0-100 pra PERCENTUAL é feita no domínio, ver Cupom.validarTipoEValor).',
  })
  @IsNumber()
  @Min(0)
  valor!: number;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  validoAte?: Date;

  @ApiPropertyOptional({
    example: 100,
    minimum: 1,
    description: 'Limite total de usos, somando todos os clientes.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usoMaximo?: number;

  @ApiPropertyOptional({
    example: 50,
    minimum: 0,
    description:
      'Subtotal mínimo do carrinho (já líquido de desconto de atacado) pra este cupom poder ser aplicado.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMinimoPedido?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description:
      'Limite de usos POR cliente — independente do usoMaximo global. Convidado (sem conta) nunca é limitado por aqui.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limiteUsoPorCliente?: number;

  @ApiPropertyOptional({
    type: [String],
    description:
      'IDs de categoria aos quais este cupom fica restrito. Ausente/vazio = sem restrição por categoria.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  categoriaIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'IDs de produto aos quais este cupom fica restrito. Ausente/vazio = sem restrição por produto.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  produtoIds?: string[];
}
