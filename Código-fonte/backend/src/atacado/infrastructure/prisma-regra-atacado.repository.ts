import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RegraAtacado } from '../domain/regra-atacado.entity';
import { RegraAtacadoRepository } from '../domain/regra-atacado.repository';
import type { RegraAtacado as RegraAtacadoPrisma } from '@prisma/client';
import { TipoDesconto } from '../../cupons/domain/cupom.entity';

@Injectable()
export class PrismaRegraAtacadoRepository extends RegraAtacadoRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async buscarAplicaveis(produtoIds: string[], categoriaIds: string[]): Promise<RegraAtacado[]> {
    if (produtoIds.length === 0 && categoriaIds.length === 0) return [];

    const regras = await this.prisma.regraAtacado.findMany({
      where: {
        ativo: true,
        OR: [
          produtoIds.length ? { produtoId: { in: produtoIds } } : undefined,
          categoriaIds.length ? { categoriaId: { in: categoriaIds } } : undefined,
        ].filter((clausula): clausula is NonNullable<typeof clausula> => clausula !== undefined),
      },
    });
    return regras.map((regra) => this.paraDominio(regra));
  }

  private paraDominio(regra: RegraAtacadoPrisma): RegraAtacado {
    return new RegraAtacado(
      regra.id,
      regra.quantidadeMinima,
      regra.tipoDesconto as unknown as TipoDesconto,
      Number(regra.valor),
      regra.ativo,
      regra.createdAt,
      regra.produtoId ?? undefined,
      regra.categoriaId ?? undefined,
    );
  }
}
