import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './shared/prisma/prisma.module';
import { envValidationSchema } from './shared/config/env-validation.schema';
import { ProdutosModule } from './produtos/infrastructure/produtos.module';
import { CategoriasModule } from './categorias/infrastructure/categorias.module';
import { MarcasModule } from './marcas/infrastructure/marcas.module';
import { CarrinhoModule } from './carrinho/infrastructure/carrinho.module';
import { PedidosModule } from './pedidos/infrastructure/pedidos.module';
import { PagamentosModule } from './pagamentos/infrastructure/pagamentos.module';
import { AuthModule } from './auth/infrastructure/auth.module';
import { ClientesModule } from './clientes/infrastructure/clientes.module';
import { FreteModule } from './frete/infrastructure/frete.module';
import { CuponsModule } from './cupons/infrastructure/cupons.module';
import { BannersModule } from './banners/infrastructure/banners.module';
import { ResenhasModule } from './resenhas/infrastructure/resenhas.module';
import { EmailsModule } from './emails/infrastructure/emails.module';
import { ObservabilityModule } from './shared/observability/observability.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ScheduleModule.forRoot(),
    // maxRetriesPerRequest baixo + offline queue desligada: se o Redis estiver fora do
    // ar (ou não existir, como no ambiente de testes e2e, que não sobe Redis), enfileirar
    // um e-mail falha rápido em vez de travar a requisição HTTP esperando reconexão —
    // BullmqEmailQueueAdapter já captura esse erro e só loga (ver EmailQueuePort).
    //
    // retryStrategy é o que efetivamente limita o worker de e-mails (EmailProcessor):
    // o BullMQ força maxRetriesPerRequest=null na conexão de bloqueio do worker (é
    // exigência da própria lib pra comandos bloqueantes, ignora o valor acima só pra
    // essa conexão) — sem isso, ioredis reconecta pra sempre e `app.close()` trava
    // esperando o worker fechar (achado rodando a suíte e2e inteira: sem Redis, cada
    // app de teste deixava uma conexão retentando indefinidamente, acumulando entre
    // arquivos até o processo do Jest ficar sobrecarregado). Retornar null depois de
    // poucas tentativas faz o ioredis desistir e emitir erro em vez de retry infinito.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          connectTimeout: 2_000,
          retryStrategy: (tentativas: number) =>
            tentativas > 3 ? null : Math.min(tentativas * 200, 2_000),
        },
      }),
    }),
    PrismaModule,
    ObservabilityModule,
    HealthModule,
    ProdutosModule,
    CategoriasModule,
    MarcasModule,
    CarrinhoModule,
    PedidosModule,
    PagamentosModule,
    AuthModule,
    ClientesModule,
    FreteModule,
    CuponsModule,
    BannersModule,
    ResenhasModule,
    EmailsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
