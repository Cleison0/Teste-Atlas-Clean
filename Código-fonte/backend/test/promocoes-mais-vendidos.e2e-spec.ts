// Teste e2e de ponta a ponta contra Postgres real pra duas features novas:
// - Preço promocional: cadastrado no admin, filtrável na vitrine (?emPromocao=true),
//   e — o ponto mais importante — realmente cobrado no carrinho/pedido (não só exibido).
// - Mais vendidos: agregação real de ItemPedido por produto, só contando pedidos que
//   passaram de PAGO (nunca CRIADO/CANCELADO).
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { DomainExceptionFilter } from '../src/shared/exceptions/domain-exception.filter';

describe('Preço promocional e mais vendidos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let produtoTipoId: string;
  let marcaId: string;
  let tokenAdmin: string;

  const contatoValido = {
    nome: 'Maria da Silva',
    email: 'maria@example.com',
    telefone: '(22) 99999-8888',
  };

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
    const jwtService = moduleRef.get(JwtService);
    tokenAdmin = jwtService.sign({ sub: randomUUID(), email: 'admin@teste.com', papel: 'ADMIN' });

    const categoria = await prisma.categoria.create({
      data: { slug: `categoria-teste-${randomUUID()}`, nome: 'Categoria de teste' },
    });
    const marca = await prisma.marca.create({ data: { nome: `Marca de teste ${randomUUID()}` } });
    const produtoTipo = await prisma.produtoTipo.create({
      data: { categoriaId: categoria.id, nome: `Tipo de teste ${randomUUID()}` },
    });
    produtoTipoId = produtoTipo.id;
    marcaId = marca.id;
  });

  afterAll(async () => {
    await app.close();
  });

  function criarProdutoComEstoque(estoque: number, preco = 100) {
    return prisma.produto.create({
      data: {
        id: randomUUID(),
        nome: `Produto de teste ${randomUUID()}`,
        slug: `produto-teste-${randomUUID()}`,
        pack: 'unidade',
        preco,
        estoque,
        produtoTipoId,
        marcaId,
      },
    });
  }

  /** Cria o pedido em AGUARDANDO_CONTATO (canal whatsapp) e confirma como PAGO — mesmo
   * padrão de cupom-checkout.e2e-spec.ts, é o jeito mais direto de simular uma venda
   * concluída sem precisar orquestrar o gateway de pagamento de verdade. */
  async function criarPedidoPago(itens: { produtoId: string; quantidade: number }[]) {
    const criacao = await request(app.getHttpServer())
      .post('/pedidos')
      .send({ itens, tipoEntrega: 'RETIRADA', contato: contatoValido, canal: 'whatsapp' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/pedidos/${criacao.body.id}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'PAGO' })
      .expect(200);

    return criacao.body;
  }

  describe('preço promocional', () => {
    it('POST /produtos rejeita preço promocional maior ou igual ao preço normal (400)', async () => {
      await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nome: 'Produto inválido', preco: 50, precoPromocional: 50, categoria: 'limpeza' })
        .expect(400);
    });

    it('POST /produtos aceita preço promocional válido e GET /produtos devolve o campo', async () => {
      const criacao = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          nome: 'Produto em promoção',
          preco: 50,
          precoPromocional: 35,
          categoria: 'limpeza',
        })
        .expect(201);

      expect(criacao.body.precoPromocional).toBe(35);

      const busca = await request(app.getHttpServer())
        .get(`/produtos/${criacao.body.id}`)
        .expect(200);
      expect(busca.body.precoPromocional).toBe(35);
    });

    it('GET /produtos?emPromocao=true só devolve produtos com promoção ativa', async () => {
      const comPromocao = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nome: 'Com promoção', preco: 40, precoPromocional: 30, categoria: 'limpeza' })
        .expect(201);
      await criarProdutoComEstoque(5, 40); // sem promoção — não deve aparecer no filtro

      const resposta = await request(app.getHttpServer())
        .get('/produtos?pagina=1&limite=200&emPromocao=true')
        .expect(200);

      const ids = resposta.body.itens.map((p: { id: string }) => p.id);
      expect(ids).toContain(comPromocao.body.id);
      expect(
        resposta.body.itens.every(
          (p: { precoPromocional?: number }) => p.precoPromocional !== undefined,
        ),
      ).toBe(true);
    });

    it('POST /carrinho/calcular cobra o preço promocional, não o normal', async () => {
      const produto = await prisma.produto.create({
        data: {
          id: randomUUID(),
          nome: `Produto promo ${randomUUID()}`,
          slug: `produto-promo-${randomUUID()}`,
          preco: 100,
          precoPromocional: 70,
          estoque: 5,
          produtoTipoId,
          marcaId,
        },
      });

      const resposta = await request(app.getHttpServer())
        .post('/carrinho/calcular')
        .send({ itens: [{ produtoId: produto.id, quantidade: 2 }] })
        .expect(201);

      expect(resposta.body.itens[0].precoUnitario).toBe(70);
      expect(resposta.body.total).toBe(140);
    });

    it('POST /pedidos cobra o preço promocional no total do pedido', async () => {
      const produto = await prisma.produto.create({
        data: {
          id: randomUUID(),
          nome: `Produto promo pedido ${randomUUID()}`,
          slug: `produto-promo-pedido-${randomUUID()}`,
          preco: 100,
          precoPromocional: 80,
          estoque: 5,
          produtoTipoId,
          marcaId,
        },
      });

      const resposta = await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          itens: [{ produtoId: produto.id, quantidade: 1 }],
          tipoEntrega: 'RETIRADA',
          contato: contatoValido,
        })
        .expect(201);

      expect(resposta.body.total).toBe(80);
    });

    it('PUT /produtos/:id com precoPromocional null remove a promoção', async () => {
      const criacao = await request(app.getHttpServer())
        .post('/produtos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nome: 'Vai perder a promoção', preco: 50, precoPromocional: 40 })
        .expect(201);

      const atualizacao = await request(app.getHttpServer())
        .put(`/produtos/${criacao.body.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ precoPromocional: null })
        .expect(200);

      expect(atualizacao.body.precoPromocional).toBeUndefined();
    });
  });

  describe('mais vendidos', () => {
    it('produto sem nenhuma venda paga não aparece em /produtos/mais-vendidos', async () => {
      const produto = await criarProdutoComEstoque(5, 20);
      // Pedido criado mas nunca pago — não deve contar como venda.
      await request(app.getHttpServer())
        .post('/pedidos')
        .send({
          itens: [{ produtoId: produto.id, quantidade: 1 }],
          tipoEntrega: 'RETIRADA',
          contato: contatoValido,
        })
        .expect(201);

      const resposta = await request(app.getHttpServer())
        .get('/produtos/mais-vendidos?limite=50')
        .expect(200);

      const ids = resposta.body.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(produto.id);
    });

    it('produto com pedido PAGO aparece em /produtos/mais-vendidos', async () => {
      const produto = await criarProdutoComEstoque(5, 20);
      await criarPedidoPago([{ produtoId: produto.id, quantidade: 2 }]);

      const resposta = await request(app.getHttpServer())
        .get('/produtos/mais-vendidos?limite=50')
        .expect(200);

      const ids = resposta.body.map((p: { id: string }) => p.id);
      expect(ids).toContain(produto.id);
    });

    it('ordena por quantidade total vendida, do maior pro menor', async () => {
      const maisVendido = await criarProdutoComEstoque(20, 20);
      const menosVendido = await criarProdutoComEstoque(20, 20);
      await criarPedidoPago([{ produtoId: maisVendido.id, quantidade: 10 }]);
      await criarPedidoPago([{ produtoId: menosVendido.id, quantidade: 1 }]);

      const resposta = await request(app.getHttpServer())
        .get('/produtos/mais-vendidos?limite=50')
        .expect(200);

      const ids = resposta.body.map((p: { id: string }) => p.id);
      expect(ids.indexOf(maisVendido.id)).toBeLessThan(ids.indexOf(menosVendido.id));
    });

    it('pedido cancelado depois de pago não conta como venda (estorna da contagem)', async () => {
      const produto = await criarProdutoComEstoque(5, 20);
      const pedido = await criarPedidoPago([{ produtoId: produto.id, quantidade: 1 }]);

      await request(app.getHttpServer())
        .patch(`/pedidos/${pedido.id}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'CANCELADO' })
        .expect(200);

      const resposta = await request(app.getHttpServer())
        .get('/produtos/mais-vendidos?limite=50')
        .expect(200);

      const ids = resposta.body.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(produto.id);
    });

    it('respeita o parâmetro limite', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/produtos/mais-vendidos?limite=2')
        .expect(200);

      expect(resposta.body.length).toBeLessThanOrEqual(2);
    });
  });
});
