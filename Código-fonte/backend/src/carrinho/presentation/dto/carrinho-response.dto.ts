import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Carrinho } from '../../domain/item-precificado';

class ItemCarrinhoResponseDto {
  @ApiProperty({ example: 'b3f1c2d4-5678-4abc-9def-0123456789ab' })
  produtoId: string;

  @ApiProperty({ example: 'Detergente para Louça' })
  nome: string;

  @ApiProperty({ example: 2 })
  quantidade: number;

  @ApiProperty({ example: 12.9 })
  precoUnitario: number;

  @ApiProperty({ example: 25.8 })
  subtotal: number;

  @ApiProperty({
    example: 0,
    description:
      'Desconto automático por quantidade (atacado) já aplicado a este item — 0 se nenhuma regra se aplica.',
  })
  descontoAtacado: number;
}

export class CarrinhoResponseDto {
  @ApiProperty({ type: [ItemCarrinhoResponseDto] })
  itens: ItemCarrinhoResponseDto[];

  @ApiProperty({
    example: 25.8,
    description: 'Soma dos itens pelo preço de catálogo, sem nenhum desconto.',
  })
  total: number;

  @ApiProperty({
    example: 0,
    description: 'Soma dos descontos automáticos de atacado de todos os itens.',
  })
  descontoAtacado: number;

  @ApiProperty({
    example: 0,
    description: '0 quando nenhum cupom foi aplicado. Só o desconto do cupom por código.',
  })
  desconto: number;

  @ApiProperty({
    example: 25.8,
    description: 'total - descontoAtacado - desconto — o que o cliente paga.',
  })
  totalComDesconto: number;

  @ApiPropertyOptional({ example: 'BEMVINDO10' })
  cupomCodigo?: string;

  static fromDomain(carrinho: Carrinho): CarrinhoResponseDto {
    const dto = new CarrinhoResponseDto();
    dto.itens = carrinho.itens.map((item) => ({
      produtoId: item.produtoId,
      nome: item.nome,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      subtotal: item.subtotal,
      descontoAtacado: item.descontoAtacado,
    }));
    dto.total = carrinho.total;
    dto.descontoAtacado = carrinho.descontoAtacado;
    dto.desconto = carrinho.desconto;
    dto.totalComDesconto = Number((carrinho.total - carrinho.descontoTotal).toFixed(2));
    dto.cupomCodigo = carrinho.cupomCodigo;
    return dto;
  }
}
