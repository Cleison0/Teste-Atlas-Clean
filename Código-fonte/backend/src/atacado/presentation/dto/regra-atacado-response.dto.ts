import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegraAtacado } from '../../domain/regra-atacado.entity';
import { TipoDesconto } from '../../../cupons/domain/cupom.entity';

export class RegraAtacadoResponseDto {
  @ApiProperty({ example: 'b3f1c2d4-5678-4abc-9def-0123456789ab' })
  id!: string;

  @ApiPropertyOptional({ example: 'b492ec22-b3fc-4e9b-a641-e48b16f5efc0' })
  produtoId?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-...' })
  categoriaId?: string;

  @ApiProperty({ example: 12 })
  quantidadeMinima!: number;

  @ApiProperty({ enum: ['PERCENTUAL', 'VALOR_FIXO'] })
  tipoDesconto!: TipoDesconto;

  @ApiProperty({ example: 10 })
  valor!: number;

  @ApiProperty({ example: true })
  ativo!: boolean;

  @ApiProperty({ example: '2026-08-22T18:30:00.000Z' })
  createdAt!: Date;

  static fromDomain(regra: RegraAtacado): RegraAtacadoResponseDto {
    const dto = new RegraAtacadoResponseDto();
    dto.id = regra.id;
    dto.produtoId = regra.produtoId;
    dto.categoriaId = regra.categoriaId;
    dto.quantidadeMinima = regra.quantidadeMinima;
    dto.tipoDesconto = regra.tipoDesconto;
    dto.valor = regra.valor;
    dto.ativo = regra.ativo;
    dto.createdAt = regra.createdAt;
    return dto;
  }
}
