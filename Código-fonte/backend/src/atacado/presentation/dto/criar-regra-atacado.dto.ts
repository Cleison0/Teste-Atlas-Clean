import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TipoDesconto } from '../../../cupons/domain/cupom.entity';

export class CriarRegraAtacadoDto {
  @ApiPropertyOptional({
    example: 'b492ec22-b3fc-4e9b-a641-e48b16f5efc0',
    description: 'Exatamente um entre produtoId e categoriaId deve ser informado.',
  })
  @IsOptional()
  @IsString()
  produtoId?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-...' })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiProperty({ example: 12, minimum: 2, description: 'Quantidade mínima do item no carrinho.' })
  @IsInt()
  @Min(2)
  quantidadeMinima!: number;

  @ApiProperty({ enum: ['PERCENTUAL', 'VALOR_FIXO'] })
  @IsIn(['PERCENTUAL', 'VALOR_FIXO'])
  tipoDesconto!: TipoDesconto;

  @ApiProperty({
    example: 10,
    minimum: 0,
    description: '% se PERCENTUAL (0 a 100), R$ se VALOR_FIXO.',
  })
  @IsNumber()
  @Min(0)
  valor!: number;
}
