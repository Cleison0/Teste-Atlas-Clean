import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Cupom, TipoDesconto } from '../domain/cupom.entity';
import { CupomEsgotadoException } from '../domain/cupons.exceptions';
import {
  CupomRepository,
  DadosAtualizacaoCupom,
  DadosCriacaoCupom,
} from '../domain/cupom.repository';
import type {
  Cupom as CupomPrisma,
  TipoDesconto as TipoDescontoPrisma,
  Prisma,
} from '@prisma/client';

/** Cliente Prisma "normal" ou um client de transação (`tx` de `$transaction`) — mesma
 * API para o que é usado aqui (mesmo padrão de PrismaPedidoRepository). */
type ClientePrisma = PrismaService | Prisma.TransactionClient;

type CupomComRestricoes = CupomPrisma & {
  categorias: { categoriaId: string }[];
  produtos: { produtoId: string }[];
};

const INCLUDE_RESTRICOES = {
  categorias: { select: { categoriaId: true } },
  produtos: { select: { produtoId: true } },
} satisfies Prisma.CupomInclude;

@Injectable()
export class PrismaCupomRepository extends CupomRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listarTodos(): Promise<Cupom[]> {
    const cupons = await this.prisma.cupom.findMany({
      orderBy: { createdAt: 'desc' },
      include: INCLUDE_RESTRICOES,
    });
    return cupons.map((cupom) => this.paraDominio(cupom));
  }

  async buscarPorId(id: string): Promise<Cupom | null> {
    const cupom = await this.prisma.cupom.findUnique({
      where: { id },
      include: INCLUDE_RESTRICOES,
    });
    return cupom ? this.paraDominio(cupom) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Cupom | null> {
    const cupom = await this.prisma.cupom.findUnique({
      where: { codigo },
      include: INCLUDE_RESTRICOES,
    });
    return cupom ? this.paraDominio(cupom) : null;
  }

  async criar(dados: DadosCriacaoCupom): Promise<Cupom> {
    const cupom = await this.prisma.cupom.create({
      data: {
        codigo: dados.codigo,
        tipoDesconto: dados.tipoDesconto as unknown as TipoDescontoPrisma,
        valor: dados.valor,
        validoAte: dados.validoAte,
        usoMaximo: dados.usoMaximo,
        valorMinimoPedido: dados.valorMinimoPedido,
        limiteUsoPorCliente: dados.limiteUsoPorCliente,
        categorias: dados.categoriaIds?.length
          ? { create: dados.categoriaIds.map((categoriaId) => ({ categoriaId })) }
          : undefined,
        produtos: dados.produtoIds?.length
          ? { create: dados.produtoIds.map((produtoId) => ({ produtoId })) }
          : undefined,
      },
      include: INCLUDE_RESTRICOES,
    });
    return this.paraDominio(cupom);
  }

  async atualizar(id: string, dados: DadosAtualizacaoCupom): Promise<Cupom> {
    // categoriaIds/produtoIds substituem o conjunto inteiro (deleteMany + create),
    // não fazem merge — mesmo contrato documentado em DadosAtualizacaoCupom. Só mexe
    // quando o campo vem definido (undefined = mantém as restrições como estão).
    const cupom = await this.prisma.cupom.update({
      where: { id },
      data: {
        tipoDesconto: dados.tipoDesconto as unknown as TipoDescontoPrisma | undefined,
        valor: dados.valor,
        ativo: dados.ativo,
        validoAte: dados.validoAte,
        usoMaximo: dados.usoMaximo,
        valorMinimoPedido: dados.valorMinimoPedido,
        limiteUsoPorCliente: dados.limiteUsoPorCliente,
        categorias:
          dados.categoriaIds !== undefined
            ? {
                deleteMany: {},
                create: dados.categoriaIds.map((categoriaId) => ({ categoriaId })),
              }
            : undefined,
        produtos:
          dados.produtoIds !== undefined
            ? {
                deleteMany: {},
                create: dados.produtoIds.map((produtoId) => ({ produtoId })),
              }
            : undefined,
      },
      include: INCLUDE_RESTRICOES,
    });
    return this.paraDominio(cupom);
  }

  async contarUsosCliente(codigo: string, clienteId: string): Promise<number> {
    const registro = await this.prisma.cupomUsoCliente.findUnique({
      where: { cupomCodigo_clienteId: { cupomCodigo: codigo, clienteId } },
    });
    return registro?.usos ?? 0;
  }

  async incrementarUsos(codigo: string, contexto?: unknown): Promise<void> {
    const cliente = (contexto as ClientePrisma | undefined) ?? this.prisma;
    // updateMany condicional (não um SELECT seguido de UPDATE em duas queries) —
    // a checagem contra uso_maximo e o incremento acontecem atomicamente na mesma
    // instrução, então duas confirmações de pagamento simultâneas na última vaga
    // nunca conseguem passar as duas: só uma vê count=1 afetado, a outra vê 0.
    const linhasAfetadas = await cliente.$executeRaw`
      UPDATE cupons
      SET usos_count = usos_count + 1
      WHERE codigo = ${codigo} AND (uso_maximo IS NULL OR usos_count < uso_maximo)
    `;
    if (linhasAfetadas === 0) {
      throw new CupomEsgotadoException(codigo);
    }
  }

  async decrementarUsos(codigo: string, contexto?: unknown): Promise<void> {
    const cliente = (contexto as ClientePrisma | undefined) ?? this.prisma;
    await cliente.cupom.update({
      where: { codigo },
      data: { usosCount: { decrement: 1 } },
    });
  }

  async incrementarUsoCliente(
    codigo: string,
    clienteId: string,
    contexto?: unknown,
  ): Promise<void> {
    const cliente = (contexto as ClientePrisma | undefined) ?? this.prisma;
    await cliente.cupomUsoCliente.upsert({
      where: { cupomCodigo_clienteId: { cupomCodigo: codigo, clienteId } },
      create: { cupomCodigo: codigo, clienteId, usos: 1 },
      update: { usos: { increment: 1 } },
    });
  }

  async decrementarUsoCliente(
    codigo: string,
    clienteId: string,
    contexto?: unknown,
  ): Promise<void> {
    const cliente = (contexto as ClientePrisma | undefined) ?? this.prisma;
    await cliente.cupomUsoCliente.update({
      where: { cupomCodigo_clienteId: { cupomCodigo: codigo, clienteId } },
      data: { usos: { decrement: 1 } },
    });
  }

  private paraDominio(cupom: CupomComRestricoes): Cupom {
    return new Cupom(
      cupom.id,
      cupom.codigo,
      cupom.tipoDesconto as unknown as TipoDesconto,
      Number(cupom.valor),
      cupom.ativo,
      cupom.usosCount,
      cupom.createdAt,
      cupom.validoAte ?? undefined,
      cupom.usoMaximo ?? undefined,
      cupom.valorMinimoPedido !== null ? Number(cupom.valorMinimoPedido) : undefined,
      cupom.limiteUsoPorCliente ?? undefined,
      cupom.categorias.map((c) => c.categoriaId),
      cupom.produtos.map((p) => p.produtoId),
    );
  }
}
