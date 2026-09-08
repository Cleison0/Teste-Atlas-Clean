import * as Joi from 'joi';

/**
 * Valida as variÃ¡veis de ambiente na subida da aplicaÃ§Ã£o â€” falha rÃ¡pido (e com uma
 * mensagem clara) se algo obrigatÃ³rio estiver faltando ou mal formado, em vez de deixar
 * o erro estourar mais tarde num lugar aleatÃ³rio (ex.: JwtService.sign() com secret
 * undefined, ou uma query com DATABASE_URL invÃ¡lida).
 *
 * SÃ³ DATABASE_URL e JWT_SECRET sÃ£o obrigatÃ³rios â€” as integraÃ§Ãµes externas (Mercado
 * Pago, Cloudinary) ficam opcionais aqui de propÃ³sito: dÃ¡ pra rodar a API localmente
 * sem essas credenciais, sÃ³ os endpoints que dependem delas Ã© que falham na hora do uso.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string().min(16).required(),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').optional(),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  MERCADOPAGO_ACCESS_TOKEN: Joi.string().allow('').optional(),
  MERCADOPAGO_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  MERCADOPAGO_NOTIFICATION_URL: Joi.string().uri().allow('').optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),
  // Frete: opcionais de propÃ³sito (mesmo padrÃ£o do Mercado Pago/Cloudinary acima) â€”
  // sem MELHOR_ENVIO_TOKEN/FRETE_CEP_ORIGEM, ShippingQuoteProviderComFallback cai
  // direto pra tabela regional, entÃ£o a API sobe normalmente em dev sem essas chaves.
  MELHOR_ENVIO_TOKEN: Joi.string().allow('').optional(),
  MELHOR_ENVIO_BASE_URL: Joi.string().uri().allow('').optional(),
  FRETE_CEP_ORIGEM: Joi.string().allow('').optional(),
  // Sem valor definido = regra de frete grÃ¡tis desligada (nenhum pedido se qualifica).
  FRETE_GRATIS_ACIMA_DE: Joi.number().positive().optional(),
}).unknown(true); // nÃ£o rejeita outras variÃ¡veis de ambiente do sistema (PATH, etc.)
