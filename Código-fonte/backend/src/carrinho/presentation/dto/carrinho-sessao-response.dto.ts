import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ItemCarrinhoIndisponivel,
  ItemCarrinhoVisualizado,
  MotivoIndisponibilidadeCarrinho,
  ResultadoVisualizacaoCarrinho,
} from '../../application/visualizar-carrinho.use-case';

class ItemCarrinhoSessaoResponseDto {
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

  @ApiProperty({ example: true })
  disponivel: boolean;

  @ApiProperty({ example: 10 })
  estoqueDisponivel: number;
}

class ItemCarrinhoIndisponivelResponseDto {
  @ApiProperty({ example: 'b3f1c2d4-5678-4abc-9def-0123456789ab' })
  produtoId: string;

  @ApiPropertyOptional({
    example: 'Detergente para Louça',
    description: 'Ausente só quando o produto sumiu de vez do catálogo.',
  })
  nome?: string;

  @ApiProperty({ example: 'SEM_ESTOQUE', enum: ['PRODUTO_INDISPONIVEL', 'SEM_ESTOQUE'] })
  motivo: MotivoIndisponibilidadeCarrinho;
}

export class CarrinhoSessaoResponseDto {
  @ApiPropertyOptional({
    description: 'Token de sessão do carrinho anônimo — repassar no header X-Cart-Session.',
  })
  sessionToken?: string;

  @ApiProperty({ type: [ItemCarrinhoSessaoResponseDto] })
  itens: ItemCarrinhoSessaoResponseDto[];

  @ApiProperty({ type: [ItemCarrinhoIndisponivelResponseDto] })
  itensIndisponiveis: ItemCarrinhoIndisponivelResponseDto[];

  @ApiProperty({ example: 25.8, description: 'Soma dos itens, sem desconto.' })
  total: number;

  @ApiProperty({
    example: 0,
    description: 'Soma dos descontos automáticos de atacado (por quantidade) de todos os itens.',
  })
  descontoAtacado: number;

  @ApiProperty({
    example: 0,
    description: '0 quando nenhum cupom válido está aplicado. Só o desconto do cupom por código.',
  })
  desconto: number;

  @ApiProperty({
    example: 25.8,
    description: 'total - descontoAtacado - desconto — o que o cliente paga.',
  })
  totalComDesconto: number;

  @ApiPropertyOptional({ example: 'BEMVINDO10' })
  cupomCodigo?: string;

  @ApiPropertyOptional({
    example: 'Cupom "BEMVINDO10" expirou.',
    description:
      'Preenchido só quando um cupom salvo no carrinho deixou de ser válido nesta leitura (expirou, esgotou, o subtotal caiu abaixo do mínimo etc.) — o cupom já foi removido do carrinho, esta é a mensagem pra explicar por quê.',
  })
  avisoCupom?: string;

  static fromResultado(resultado: ResultadoVisualizacaoCarrinho): CarrinhoSessaoResponseDto {
    const dto = new CarrinhoSessaoResponseDto();
    dto.sessionToken = resultado.sessionToken;
    dto.itens = resultado.itens.map((item: ItemCarrinhoVisualizado) => ({ ...item }));
    dto.itensIndisponiveis = resultado.itensIndisponiveis.map((item: ItemCarrinhoIndisponivel) => ({
      ...item,
    }));
    dto.total = resultado.total;
    dto.descontoAtacado = resultado.descontoAtacado;
    dto.desconto = resultado.desconto;
    dto.totalComDesconto = resultado.totalComDesconto;
    dto.cupomCodigo = resultado.cupomCodigo;
    dto.avisoCupom = resultado.avisoCupom;
    return dto;
  }
}
