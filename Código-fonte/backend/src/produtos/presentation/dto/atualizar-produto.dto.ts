import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { CriarProdutoDto } from './criar-produto.dto';

// Omite precoPromocional da base antes do PartialType — o campo herdado seria
// `number | undefined`, e aqui `null` precisa ter significado próprio (remove a
// promoção, diferente de `undefined` = não mexe), o que TypeScript não deixa fazer
// só sobrescrevendo a propriedade (variância de tipo não permite alargar o tipo).
export class AtualizarProdutoDto extends PartialType(
  OmitType(CriarProdutoDto, ['precoPromocional'] as const),
) {
  @ApiPropertyOptional({
    example: 9.9,
    minimum: 0,
    description: 'Precisa ser menor que `preco`. `null` remove a promoção; omitido = não mexe.',
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precoPromocional?: number | null;
}
