// Teste e2e de ponta a ponta contra Postgres real pras duas extensões que a página
// de detalhe de produto precisou: filtro produtoTipoSlug (pra buscar só as
// variantes de um tipo, sem trazer o catálogo inteiro) e infoTecnica/precaucoes
// expostos no DTO (dado real do tipo, antes só existia no banco).
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { DomainExceptionFilter } from '../src/shared/exceptions/domain-exception.filter';

describe('Página de produto: produtoTipoSlug e specs reais (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('produtoTipoSlug filtra só as variantes daquele tipo, ignorando produtos de outros tipos', async () => {
    const categoria = await prisma.categoria.create({
      data: { slug: `categoria-detalhe-${randomUUID()}`, nome: 'Categoria detalhe' },
    });
    const tipo = await prisma.produtoTipo.create({
      data: {
        categoriaId: categoria.id,
        nome: `Tipo detalhe ${randomUUID()}`,
        slug: `tipo-detalhe-${randomUUID()}`,
        infoTecnica: 'Detergente concentrado neutro.',
        precaucoes: 'Manter fora do alcance de crianças.',
      },
    });
    const marcaA = await prisma.marca.create({ data: { nome: `Marca A ${randomUUID()}` } });
    const marcaB = await prisma.marca.create({ data: { nome: `Marca B ${randomUUID()}` } });

    const variante1 = await prisma.produto.create({
      data: {
        id: randomUUID(),
        nome: 'Variante 1',
        slug: `variante-1-${randomUUID()}`,
        preco: 10,
        estoque: 5,
        produtoTipoId: tipo.id,
        marcaId: marcaA.id,
      },
    });
    const variante2 = await prisma.produto.create({
      data: {
        id: randomUUID(),
        nome: 'Variante 2',
        slug: `variante-2-${randomUUID()}`,
        preco: 12,
        estoque: 5,
        produtoTipoId: tipo.id,
        marcaId: marcaB.id,
      },
    });
    // Produto de outro tipo, não deve aparecer.
    await prisma.produto.create({
      data: {
        id: randomUUID(),
        nome: 'De outro tipo',
        slug: `outro-tipo-${randomUUID()}`,
        preco: 10,
        estoque: 5,
      },
    });

    const resposta = await request(app.getHttpServer())
      .get(`/produtos?pagina=1&limite=200&produtoTipoSlug=${tipo.slug}`)
      .expect(200);

    const ids = resposta.body.itens.map((p: { id: string }) => p.id);
    expect(ids).toEqual(expect.arrayContaining([variante1.id, variante2.id]));
    expect(ids).toHaveLength(2);

    // infoTecnica/precaucoes vêm junto, em cada variante (mesmo tipo, mesmo texto).
    expect(resposta.body.itens[0].produtoTipo).toMatchObject({
      slug: tipo.slug,
      infoTecnica: 'Detergente concentrado neutro.',
      precaucoes: 'Manter fora do alcance de crianças.',
    });
  });

  it('GET /produtos/slug/:slug também expõe infoTecnica/precaucoes quando o tipo tem esse dado', async () => {
    const categoria = await prisma.categoria.create({
      data: { slug: `categoria-slug-${randomUUID()}`, nome: 'Categoria slug' },
    });
    const tipo = await prisma.produtoTipo.create({
      data: {
        categoriaId: categoria.id,
        nome: `Tipo slug ${randomUUID()}`,
        slug: `tipo-slug-${randomUUID()}`,
        infoTecnica: 'Texto técnico real.',
        precaucoes: 'Precauções reais.',
      },
    });
    const produto = await prisma.produto.create({
      data: {
        id: randomUUID(),
        nome: 'Produto com specs',
        slug: `produto-specs-${randomUUID()}`,
        preco: 20,
        estoque: 3,
        produtoTipoId: tipo.id,
      },
    });

    const resposta = await request(app.getHttpServer())
      .get(`/produtos/slug/${produto.slug}`)
      .expect(200);

    expect(resposta.body.produtoTipo.infoTecnica).toBe('Texto técnico real.');
    expect(resposta.body.produtoTipo.precaucoes).toBe('Precauções reais.');
  });

  it('produtoTipo sem infoTecnica/precaucoes cadastrados devolve os campos undefined (não quebra)', async () => {
    const produto = await prisma.produto.create({
      data: {
        id: randomUUID(),
        nome: 'Produto sem tipo',
        slug: `produto-sem-tipo-${randomUUID()}`,
        preco: 15,
        estoque: 2,
      },
    });

    const resposta = await request(app.getHttpServer())
      .get(`/produtos/slug/${produto.slug}`)
      .expect(200);

    expect(resposta.body.produtoTipo).toBeUndefined();
  });
});
