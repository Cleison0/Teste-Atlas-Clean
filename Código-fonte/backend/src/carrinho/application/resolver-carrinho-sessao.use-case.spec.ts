// Testes do coração do carrinho persistido: qual carrinho corresponde a uma
// requisição (por cliente logado, por sessionToken anônimo, ou nenhum), quando criar
// um novo, e as duas regras de login: "adoção" (carrinho anônimo passa a ser do
// cliente quando ele ainda não tem um carrinho próprio) e "merge" (quando ele já
// tem, as quantidades do carrinho anônimo são somadas nele, que fica vazio).
import { ResolverCarrinhoSessaoUseCase } from './resolver-carrinho-sessao.use-case';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { CarrinhoSessao } from '../domain/carrinho-sessao';

function criarCarrinho(overrides: Partial<CarrinhoSessao> = {}): CarrinhoSessao {
  return new CarrinhoSessao(
    overrides.id ?? 'carrinho-1',
    overrides.sessionToken ?? 'token-existente',
    overrides.clienteId,
    overrides.itens ?? [],
    overrides.expiraEm,
  );
}

describe('ResolverCarrinhoSessaoUseCase', () => {
  let carrinhoSessaoRepository: jest.Mocked<CarrinhoSessaoRepository>;
  let useCase: ResolverCarrinhoSessaoUseCase;

  beforeEach(() => {
    carrinhoSessaoRepository = {
      buscarPorSessionToken: jest.fn(),
      buscarPorClienteId: jest.fn(),
      criar: jest.fn(),
      adotarPorCliente: jest.fn(),
      upsertItem: jest.fn(),
      definirQuantidadeItem: jest.fn(),
      removerItem: jest.fn(),
      limpar: jest.fn(),
      deletarExpirados: jest.fn(),
    } as unknown as jest.Mocked<CarrinhoSessaoRepository>;

    useCase = new ResolverCarrinhoSessaoUseCase(carrinhoSessaoRepository);
  });

  it('devolve undefined sem criar quando nada é encontrado e criarSeNaoExistir é false', async () => {
    const resultado = await useCase.executar(undefined, undefined, false);

    expect(resultado).toEqual({ carrinho: undefined, sessionTokenNovo: undefined });
    expect(carrinhoSessaoRepository.criar).not.toHaveBeenCalled();
  });

  it('busca por clienteId com prioridade sobre sessionToken — carrinho do cliente é o resultado', async () => {
    const carrinhoDoCliente = criarCarrinho({ id: 'carrinho-cliente', clienteId: 'cliente-1' });
    carrinhoSessaoRepository.buscarPorClienteId.mockResolvedValue(carrinhoDoCliente);
    // sessionToken diferente do carrinho do cliente e sem carrinho anônimo real por
    // trás (mock não configurado = undefined) — só confirma que o carrinho do
    // cliente prevalece, não que o sessionToken é ignorado (ver describe('merge...')
    // logo abaixo pro caso em que ele importa).
    carrinhoSessaoRepository.buscarPorSessionToken.mockResolvedValue(null);

    const resultado = await useCase.executar('token-anonimo', 'cliente-1', false);

    expect(resultado.carrinho).toBe(carrinhoDoCliente);
  });

  it('busca por sessionToken quando não há clienteId', async () => {
    const carrinhoAnonimo = criarCarrinho({ id: 'carrinho-anon' });
    carrinhoSessaoRepository.buscarPorSessionToken.mockResolvedValue(carrinhoAnonimo);

    const resultado = await useCase.executar('token-anonimo', undefined, false);

    expect(resultado.carrinho).toBe(carrinhoAnonimo);
    expect(carrinhoSessaoRepository.buscarPorClienteId).not.toHaveBeenCalled();
  });

  it('adota o carrinho anônimo quando o cliente loga e ainda não tem carrinho próprio', async () => {
    carrinhoSessaoRepository.buscarPorClienteId.mockResolvedValue(null);
    const carrinhoAnonimo = criarCarrinho({ id: 'carrinho-anon', clienteId: undefined });
    carrinhoSessaoRepository.buscarPorSessionToken.mockResolvedValue(carrinhoAnonimo);

    const resultado = await useCase.executar('token-anonimo', 'cliente-1', false);

    expect(carrinhoSessaoRepository.adotarPorCliente).toHaveBeenCalledWith(
      'carrinho-anon',
      'cliente-1',
    );
    expect(resultado.carrinho).toBe(carrinhoAnonimo);
  });

  it('cliente já tem carrinho próprio e não veio sessionToken — nada a fundir', async () => {
    const carrinhoDoCliente = criarCarrinho({ id: 'carrinho-cliente', clienteId: 'cliente-1' });
    carrinhoSessaoRepository.buscarPorClienteId.mockResolvedValue(carrinhoDoCliente);

    const resultado = await useCase.executar(undefined, 'cliente-1', false);

    expect(resultado.carrinho).toBe(carrinhoDoCliente);
    expect(carrinhoSessaoRepository.buscarPorSessionToken).not.toHaveBeenCalled();
    expect(carrinhoSessaoRepository.adotarPorCliente).not.toHaveBeenCalled();
  });

  it('sessionToken igual ao do próprio carrinho do cliente — mesmo carrinho, não busca de novo', async () => {
    const carrinhoDoCliente = criarCarrinho({
      id: 'carrinho-cliente',
      sessionToken: 'token-do-cliente',
      clienteId: 'cliente-1',
    });
    carrinhoSessaoRepository.buscarPorClienteId.mockResolvedValue(carrinhoDoCliente);

    const resultado = await useCase.executar('token-do-cliente', 'cliente-1', false);

    expect(resultado.carrinho).toBe(carrinhoDoCliente);
    expect(carrinhoSessaoRepository.buscarPorSessionToken).not.toHaveBeenCalled();
  });

  describe('merge do carrinho anônimo quando o cliente já tem carrinho próprio', () => {
    it('soma as quantidades do carrinho anônimo no carrinho do cliente e esvazia o anônimo', async () => {
      const carrinhoDoCliente = criarCarrinho({
        id: 'carrinho-cliente',
        sessionToken: 'token-cliente',
        clienteId: 'cliente-1',
        itens: [{ produtoId: 'produto-1', quantidade: 1 }],
      });
      const carrinhoAnonimo = criarCarrinho({
        id: 'carrinho-anonimo',
        sessionToken: 'token-anonimo',
        itens: [
          { produtoId: 'produto-1', quantidade: 2 },
          { produtoId: 'produto-2', quantidade: 3 },
        ],
      });
      const carrinhoClienteAtualizado = criarCarrinho({
        id: 'carrinho-cliente',
        sessionToken: 'token-cliente',
        clienteId: 'cliente-1',
        itens: [
          { produtoId: 'produto-1', quantidade: 3 },
          { produtoId: 'produto-2', quantidade: 3 },
        ],
      });
      carrinhoSessaoRepository.buscarPorClienteId
        .mockResolvedValueOnce(carrinhoDoCliente)
        .mockResolvedValueOnce(carrinhoClienteAtualizado);
      carrinhoSessaoRepository.buscarPorSessionToken.mockResolvedValue(carrinhoAnonimo);

      const resultado = await useCase.executar('token-anonimo', 'cliente-1', false);

      expect(carrinhoSessaoRepository.upsertItem).toHaveBeenCalledWith(
        'carrinho-cliente',
        'produto-1',
        2,
        expect.any(Date),
      );
      expect(carrinhoSessaoRepository.upsertItem).toHaveBeenCalledWith(
        'carrinho-cliente',
        'produto-2',
        3,
        expect.any(Date),
      );
      expect(carrinhoSessaoRepository.limpar).toHaveBeenCalledWith('carrinho-anonimo');
      expect(resultado.carrinho).toBe(carrinhoClienteAtualizado);
    });

    it('não funde quando o carrinho anônimo referenciado pelo token não existe (token morto)', async () => {
      const carrinhoDoCliente = criarCarrinho({ id: 'carrinho-cliente', clienteId: 'cliente-1' });
      carrinhoSessaoRepository.buscarPorClienteId.mockResolvedValue(carrinhoDoCliente);
      carrinhoSessaoRepository.buscarPorSessionToken.mockResolvedValue(null);

      const resultado = await useCase.executar('token-morto', 'cliente-1', false);

      expect(resultado.carrinho).toBe(carrinhoDoCliente);
      expect(carrinhoSessaoRepository.upsertItem).not.toHaveBeenCalled();
      expect(carrinhoSessaoRepository.limpar).not.toHaveBeenCalled();
    });

    it('não funde quando o carrinho anônimo está vazio (nada a somar)', async () => {
      const carrinhoDoCliente = criarCarrinho({ id: 'carrinho-cliente', clienteId: 'cliente-1' });
      carrinhoSessaoRepository.buscarPorClienteId.mockResolvedValue(carrinhoDoCliente);
      carrinhoSessaoRepository.buscarPorSessionToken.mockResolvedValue(
        criarCarrinho({ id: 'carrinho-anonimo-vazio', itens: [] }),
      );

      const resultado = await useCase.executar('token-anonimo-vazio', 'cliente-1', false);

      expect(resultado.carrinho).toBe(carrinhoDoCliente);
      expect(carrinhoSessaoRepository.upsertItem).not.toHaveBeenCalled();
      expect(carrinhoSessaoRepository.limpar).not.toHaveBeenCalled();
    });

    it('não funde um carrinho que já pertence a outro cliente (nunca deveria acontecer, mas não quebra)', async () => {
      const carrinhoDoCliente = criarCarrinho({ id: 'carrinho-cliente', clienteId: 'cliente-1' });
      carrinhoSessaoRepository.buscarPorClienteId.mockResolvedValue(carrinhoDoCliente);
      carrinhoSessaoRepository.buscarPorSessionToken.mockResolvedValue(
        criarCarrinho({
          id: 'carrinho-de-outro-cliente',
          clienteId: 'cliente-2',
          itens: [{ produtoId: 'produto-1', quantidade: 1 }],
        }),
      );

      const resultado = await useCase.executar('token-de-outro-cliente', 'cliente-1', false);

      expect(resultado.carrinho).toBe(carrinhoDoCliente);
      expect(carrinhoSessaoRepository.upsertItem).not.toHaveBeenCalled();
    });
  });

  it('cria um carrinho novo quando criarSeNaoExistir é true e nada foi encontrado', async () => {
    const carrinhoCriado = criarCarrinho({ id: 'carrinho-novo' });
    carrinhoSessaoRepository.criar.mockResolvedValue(carrinhoCriado);

    const resultado = await useCase.executar(undefined, undefined, true);

    expect(carrinhoSessaoRepository.criar).toHaveBeenCalledTimes(1);
    const [tokenGerado, clienteIdPassado] = carrinhoSessaoRepository.criar.mock.calls[0];
    expect(tokenGerado).toMatch(/^[0-9a-f]{64}$/);
    expect(clienteIdPassado).toBeUndefined();
    expect(resultado.carrinho).toBe(carrinhoCriado);
    expect(resultado.sessionTokenNovo).toBe(tokenGerado);
  });

  it('nunca reaproveita um sessionToken recebido mas não encontrado no banco', async () => {
    carrinhoSessaoRepository.buscarPorSessionToken.mockResolvedValue(null);
    carrinhoSessaoRepository.criar.mockResolvedValue(criarCarrinho({ id: 'carrinho-novo' }));

    await useCase.executar('token-morto-ou-expirado', undefined, true);

    const [tokenGerado] = carrinhoSessaoRepository.criar.mock.calls[0];
    expect(tokenGerado).not.toBe('token-morto-ou-expirado');
  });

  it('cria já vinculado ao clienteId quando a requisição é de um cliente logado sem carrinho', async () => {
    carrinhoSessaoRepository.buscarPorClienteId.mockResolvedValue(null);
    carrinhoSessaoRepository.criar.mockResolvedValue(
      criarCarrinho({ id: 'carrinho-novo', clienteId: 'cliente-1' }),
    );

    await useCase.executar(undefined, 'cliente-1', true);

    const [, clienteIdPassado] = carrinhoSessaoRepository.criar.mock.calls[0];
    expect(clienteIdPassado).toBe('cliente-1');
  });
});
