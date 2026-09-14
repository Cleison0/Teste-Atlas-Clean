import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RegraAtacado } from '../domain/regra-atacado.entity';
import {
  DadosAtualizacaoRegraAtacado,
  DadosCriacaoRegraAtacado,
  RegraAtacadoRepository,
} from '../domain/regra-atacado.repository';
import type { RegraAtacado as RegraAtacadoPrisma, Prisma } from '@prisma/client';
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

  async listarTodas(): Promise<RegraAtacado[]> {
    const regras = await this.prisma.regraAtacado.findMany({ orderBy: { createdAt: 'desc' } });
    return regras.map((regra) => this.paraDominio(regra));
  }

  async buscarPorId(id: string): Promise<RegraAtacado | null> {
    const regra = await this.prisma.regraAtacado.findUnique({ where: { id } });
    return regra ? this.paraDominio(regra) : null;
  }

  async criar(dados: DadosCriacaoRegraAtacado): Promise<RegraAtacado> {
    const regra = await this.prisma.regraAtacado.create({
      data: {
        produtoId: dados.produtoId,
        categoriaId: dados.categoriaId,
        quantidadeMinima: dados.quantidadeMinima,
        tipoDesconto:
          dados.tipoDesconto as unknown as Prisma.RegraAtacadoCreateInput['tipoDesconto'],
        valor: dados.valor,
      },
    });
    return this.paraDominio(regra);
  }

  async atualizar(id: string, dados: DadosAtualizacaoRegraAtacado): Promise<RegraAtacado> {
    const regra = await this.prisma.regraAtacado.update({
      where: { id },
      data: {
        quantidadeMinima: dados.quantidadeMinima,
        tipoDesconto: dados.tipoDesconto as unknown as
          Prisma.RegraAtacadoUpdateInput['tipoDesconto'] | undefined,
        valor: dados.valor,
        ativo: dados.ativo,
      },
    });
    return this.paraDominio(regra);
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
