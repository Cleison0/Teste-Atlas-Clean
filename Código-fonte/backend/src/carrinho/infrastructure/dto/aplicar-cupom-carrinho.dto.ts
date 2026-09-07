import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AplicarCupomCarrinhoDto {
  @ApiProperty({ example: 'BEMVINDO10' })
  @IsString()
  @IsNotEmpty()
  cupomCodigo: string;
}
