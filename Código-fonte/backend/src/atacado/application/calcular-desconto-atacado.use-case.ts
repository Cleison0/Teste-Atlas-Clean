import { Injectable } from '@nestjs/common';
import { RegraAtacadoRepository } from '../domain/regra-atacado.repository';

export interface ItemParaDescontoAtacado {
  produtoId: string;
  categoriaId?: string;
  quantidade: number;
  precoUnitario: number;
}

/** Chave = produtoId do item (não a regra) — um item só pode ter um desconto de
 * atacado aplicado, mesmo que mais de uma regra combine com ele. */
export type DescontosAtacadoPorItem = Map<string, number>;

/**
 * Calcula, pra cada item do carrinho, o maior desconto de atacado aplicável — puro
 * o suficiente pra não precisar de banco além da busca inicial das regras (a decisão
 * de qual regra vale mais fica toda aqui, testável sem Prisma).
 */
@Injectable()
export class CalcularDescontoAtacadoUseCase {
  constructor(private readonly regraAtacadoRepository: RegraAtacadoRepository) {}

  async executar(itens: ItemParaDescontoAtacado[]): Promise<DescontosAtacadoPorItem> {
    if (itens.length === 0) return new Map();

    const produtoIds = itens.map((item) => item.produtoId);
    const categoriaIds = itens
      .map((item) => item.categoriaId)
      .filter((id): id is string => id !== undefined);

    const regras = await this.regraAtacadoRepository.buscarAplicaveis(produtoIds, categoriaIds);
    const regrasAtivas = regras.filter((regra) => regra.ativo);

    const descontos: DescontosAtacadoPorItem = new Map();
    for (const item of itens) {
      const subtotalItem = Number((item.precoUnitario * item.quantidade).toFixed(2));
      const regrasAplicaveis = regrasAtivas.filter((regra) =>
        regra.aplicavelA(item.produtoId, item.categoriaId, item.quantidade),
      );
      if (regrasAplicaveis.length === 0) continue;

      // Mais de uma regra pode combinar com o mesmo item (ex.: regra do produto E
      // da categoria) — aplica a que dá mais desconto pro cliente, nunca soma as duas.
      const melhorDesconto = Math.max(
        ...regrasAplicaveis.map((regra) => regra.calcularDesconto(subtotalItem)),
      );
      if (melhorDesconto > 0) {
        descontos.set(item.produtoId, melhorDesconto);
      }
    }
    return descontos;
  }
}
