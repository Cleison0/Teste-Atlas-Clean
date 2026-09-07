import { AplicarCupomCarrinhoUseCase } from './aplicar-cupom-carrinho.use-case';
import { ResolverCarrinhoSessaoUseCase } from './resolver-carrinho-sessao.use-case';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { CarrinhoSessao, ItemCarrinhoSessao } from '../domain/carrinho-sessao';
import { CarrinhoVazioException } from '../domain/carrinho.exceptions';
import { CupomRepository } from '../../cupons/domain/cupom.repository';
import { Cupom } from '../../cupons/domain/cupom.entity';
import { CupomInvalidoException } from '../../cupons/domain/cupons.exceptions';

function criarCupom(overrides: Partial<Cupom> = {}): Cupom {
  return new Cupom(
    overrides.id ?? 'cupom-1',
    overrides.codigo ?? 'DESCONTO10',
    overrides.tipoDesconto ?? 'PERCENTUAL',
    overrides.valor ?? 10,
    overrides.ativo ?? true,
    overrides.usosCount ?? 0,
    overrides.createdAt ?? new Date(),
    overrides.validoAte,
    overrides.usoMaximo,
  );
}

describe('AplicarCupomCarrinhoUseCase', () => {
  let resolverCarrinhoSessaoUseCase: jest.Mocked<ResolverCarrinhoSessaoUseCase>;
  let carrinhoSessaoRepository: jest.Mocked<CarrinhoSessaoRepository>;
  let cupomRepository: jest.Mocked<CupomRepository>;
  let useCase: AplicarCupomCarrinhoUseCase;

  const carrinhoComItens = new CarrinhoSessao('carrinho-1', 'token-1', undefined, [
    new ItemCarrinhoSessao('produto-1', 2),
  ]);

  beforeEach(() => {
    resolverCarrinhoSessaoUseCase = {
      executar: jest.fn(),
    } as unknown as jest.Mocked<ResolverCarrinhoSessaoUseCase>;

    carrinhoSessaoRepository = {
      definirCupom: jest.fn(),
    } as unknown as jest.Mocked<CarrinhoSessaoRepository>;

    cupomRepository = {
      buscarPorCodigo: jest.fn(),
    } as unknown as jest.Mocked<CupomRepository>;

    useCase = new AplicarCupomCarrinhoUseCase(
      resolverCarrinhoSessaoUseCase,
      carrinhoSessaoRepository,
      cupomRepository,
    );
  });

  it('lança CarrinhoVazioException quando não há carrinho persistido', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: undefined,
      sessionTokenNovo: undefined,
    });

    await expect(useCase.executar(undefined, undefined, 'DESCONTO10')).rejects.toBeInstanceOf(
      CarrinhoVazioException,
    );
    expect(cupomRepository.buscarPorCodigo).not.toHaveBeenCalled();
  });

  it('lança CarrinhoVazioException quando o carrinho existe mas está sem itens', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: new CarrinhoSessao('carrinho-1', 'token-1', undefined, []),
      sessionTokenNovo: undefined,
    });

    await expect(useCase.executar('token-1', undefined, 'DESCONTO10')).rejects.toBeInstanceOf(
      CarrinhoVazioException,
    );
  });

  it('lança CupomInvalidoException quando o código não existe', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: carrinhoComItens,
      sessionTokenNovo: undefined,
    });
    cupomRepository.buscarPorCodigo.mockResolvedValue(null);

    await expect(useCase.executar('token-1', undefined, 'INEXISTENTE')).rejects.toBeInstanceOf(
      CupomInvalidoException,
    );
    expect(carrinhoSessaoRepository.definirCupom).not.toHaveBeenCalled();
  });

  it('lança CupomInvalidoException quando o cupom existe mas não está mais válido', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: carrinhoComItens,
      sessionTokenNovo: undefined,
    });
    cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom({ ativo: false }));

    await expect(useCase.executar('token-1', undefined, 'DESCONTO10')).rejects.toBeInstanceOf(
      CupomInvalidoException,
    );
  });

  it('normaliza o código pra maiúsculo antes de buscar', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: carrinhoComItens,
      sessionTokenNovo: undefined,
    });
    cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom());

    await useCase.executar('token-1', undefined, 'desconto10');

    expect(cupomRepository.buscarPorCodigo).toHaveBeenCalledWith('DESCONTO10');
  });

  it('salva o cupom no carrinho e devolve o sessionToken quando tudo é válido', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: carrinhoComItens,
      sessionTokenNovo: undefined,
    });
    cupomRepository.buscarPorCodigo.mockResolvedValue(criarCupom());

    const resultado = await useCase.executar('token-1', undefined, 'DESCONTO10');

    expect(carrinhoSessaoRepository.definirCupom).toHaveBeenCalledWith(
      'carrinho-1',
      'DESCONTO10',
      expect.any(Date),
    );
    expect(resultado).toBe('token-1');
  });
});
