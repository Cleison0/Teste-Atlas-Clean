import { RemoverCupomCarrinhoUseCase } from './remover-cupom-carrinho.use-case';
import { ResolverCarrinhoSessaoUseCase } from './resolver-carrinho-sessao.use-case';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { CarrinhoSessao } from '../domain/carrinho-sessao';

describe('RemoverCupomCarrinhoUseCase', () => {
  let resolverCarrinhoSessaoUseCase: jest.Mocked<ResolverCarrinhoSessaoUseCase>;
  let carrinhoSessaoRepository: jest.Mocked<CarrinhoSessaoRepository>;
  let useCase: RemoverCupomCarrinhoUseCase;

  beforeEach(() => {
    resolverCarrinhoSessaoUseCase = {
      executar: jest.fn(),
    } as unknown as jest.Mocked<ResolverCarrinhoSessaoUseCase>;

    carrinhoSessaoRepository = {
      definirCupom: jest.fn(),
    } as unknown as jest.Mocked<CarrinhoSessaoRepository>;

    useCase = new RemoverCupomCarrinhoUseCase(
      resolverCarrinhoSessaoUseCase,
      carrinhoSessaoRepository,
    );
  });

  it('no-op quando não há carrinho persistido — devolve o sessionToken recebido', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: undefined,
      sessionTokenNovo: undefined,
    });

    const resultado = await useCase.executar('token-sem-carrinho', undefined);

    expect(resultado).toBe('token-sem-carrinho');
    expect(carrinhoSessaoRepository.definirCupom).not.toHaveBeenCalled();
  });

  it('limpa o cupom do carrinho (definirCupom com null) e devolve o sessionToken resolvido', async () => {
    const carrinho = new CarrinhoSessao('carrinho-1', 'token-1', undefined, []);
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho,
      sessionTokenNovo: undefined,
    });

    const resultado = await useCase.executar('token-1', undefined);

    expect(carrinhoSessaoRepository.definirCupom).toHaveBeenCalledWith(
      'carrinho-1',
      null,
      expect.any(Date),
    );
    expect(resultado).toBe('token-1');
  });
});
