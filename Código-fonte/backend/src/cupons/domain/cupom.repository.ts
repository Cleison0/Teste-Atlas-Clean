import { Cupom, TipoDesconto } from './cupom.entity';

export interface DadosCriacaoCupom {
  codigo: string;
  tipoDesconto: TipoDesconto;
  valor: number;
  validoAte?: Date;
  usoMaximo?: number;
  valorMinimoPedido?: number;
  limiteUsoPorCliente?: number;
  /** Ausente/undefined = sem restrição. Passar array vazio tem o mesmo efeito
   * (nenhuma linha criada) — a distinção só importa em DadosAtualizacaoCupom. */
  categoriaIds?: string[];
  produtoIds?: string[];
}

export interface DadosAtualizacaoCupom {
  tipoDesconto?: TipoDesconto;
  valor?: number;
  ativo?: boolean;
  validoAte?: Date | null;
  usoMaximo?: number | null;
  valorMinimoPedido?: number | null;
  limiteUsoPorCliente?: number | null;
  /** Quando presente (mesmo array vazio), SUBSTITUI o conjunto de restrições
   * inteiro — não é um "adicionar a mais". undefined = não mexe no que já existe. */
  categoriaIds?: string[];
  produtoIds?: string[];
}

export abstract class CupomRepository {
  abstract listarTodos(): Promise<Cupom[]>;
  abstract buscarPorId(id: string): Promise<Cupom | null>;
  /** Sempre traz categoriasRestritas/produtosRestritos populados (ver Cupom) —
   * são no máximo algumas dezenas de linhas por cupom, sem necessidade de um
   * método separado só pra isso. */
  abstract buscarPorCodigo(codigo: string): Promise<Cupom | null>;
  abstract criar(dados: DadosCriacaoCupom): Promise<Cupom>;
  abstract atualizar(id: string, dados: DadosAtualizacaoCupom): Promise<Cupom>;

  /** Quantas vezes um cliente específico já usou este cupom — 0 se nunca usou.
   * Usado por ValidadorDeCupom contra `limiteUsoPorCliente`. */
  abstract contarUsosCliente(codigo: string, clienteId: string): Promise<number>;

  /**
   * Chamado só quando o pedido que usou o cupom é confirmado como PAGO — mesma
   * invariante do estoque (ver ProdutoRepository.decrementarEstoque): aplicar o cupom
   * na criação do pedido não "gasta" o uso de verdade, só a confirmação do pagamento.
   *
   * Atômico contra `usoMaximo`: se o cupom já estiver no limite no exato momento do
   * incremento (corrida entre duas confirmações simultâneas), lança
   * CupomEsgotadoException em vez de deixar usosCount passar do limite — mesmo
   * cuidado de decrementarEstoque (updateMany condicional, não um
   * check-then-write separado em duas queries).
   */
  abstract incrementarUsos(codigo: string, contexto?: unknown): Promise<void>;

  /** Espelha incrementarUsos — chamado quando um pedido PAGO que usou cupom é
   * cancelado/estornado, devolvendo o uso (mesma simetria de incrementarEstoque). */
  abstract decrementarUsos(codigo: string, contexto?: unknown): Promise<void>;

  /** Espelham incrementarUsos/decrementarUsos, mas por cliente — chamadas juntas,
   * na mesma transação (só quando o pedido tem clienteId). Sem guard atômico contra
   * limiteUsoPorCliente: a janela de corrida é um único cliente competindo consigo
   * mesmo (dois checkouts simultâneos da mesma conta), risco desprezível perto do
   * limite global compartilhado por todo mundo. */
  abstract incrementarUsoCliente(
    codigo: string,
    clienteId: string,
    contexto?: unknown,
  ): Promise<void>;
  abstract decrementarUsoCliente(
    codigo: string,
    clienteId: string,
    contexto?: unknown,
  ): Promise<void>;
}
