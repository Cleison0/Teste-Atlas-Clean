import { AplicarCupomCarrinhoUseCase } from './aplicar-cupom-carrinho.use-case';
import { ResolverCarrinhoSessaoUseCase } from './resolver-carrinho-sessao.use-case';
import { CarrinhoSessaoRepository } from '../domain/carrinho-sessao.repository';
import { CarrinhoSessao, ItemCarrinhoSessao } from '../domain/carrinho-sessao';
import { CarrinhoVazioException } from '../domain/carrinho.exceptions';
import { Carrinho, ItemPrecificado } from '../domain/item-precificado';
import { MontarCarrinhoUseCase } from './montar-carrinho.use-case';
import {
  CupomCodigoInvalidoException,
  CupomInativoException,
} from '../../cupons/domain/cupons.exceptions';

describe('AplicarCupomCarrinhoUseCase', () => {
  let resolverCarrinhoSessaoUseCase: jest.Mocked<ResolverCarrinhoSessaoUseCase>;
  let carrinhoSessaoRepository: jest.Mocked<CarrinhoSessaoRepository>;
  let montarCarrinhoUseCase: jest.Mocked<MontarCarrinhoUseCase>;
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

    montarCarrinhoUseCase = {
      executar: jest
        .fn()
        .mockResolvedValue(
          new Carrinho([new ItemPrecificado('produto-1', 'Detergente', 2, 10)], 2, 'DESCONTO10'),
        ),
    } as unknown as jest.Mocked<MontarCarrinhoUseCase>;

    useCase = new AplicarCupomCarrinhoUseCase(
      resolverCarrinhoSessaoUseCase,
      carrinhoSessaoRepository,
      montarCarrinhoUseCase,
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
    expect(montarCarrinhoUseCase.executar).not.toHaveBeenCalled();
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

  it('propaga CupomCodigoInvalidoException do MontarCarrinhoUseCase quando o código não existe', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: carrinhoComItens,
      sessionTokenNovo: undefined,
    });
    montarCarrinhoUseCase.executar.mockRejectedValue(
      new CupomCodigoInvalidoException('INEXISTENTE'),
    );

    await expect(useCase.executar('token-1', undefined, 'INEXISTENTE')).rejects.toBeInstanceOf(
      CupomCodigoInvalidoException,
    );
    expect(carrinhoSessaoRepository.definirCupom).not.toHaveBeenCalled();
  });

  it('propaga a exceção específica do MontarCarrinhoUseCase (ex.: cupom inativo) sem persistir nada', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: carrinhoComItens,
      sessionTokenNovo: undefined,
    });
    montarCarrinhoUseCase.executar.mockRejectedValue(new CupomInativoException('DESCONTO10'));

    await expect(useCase.executar('token-1', undefined, 'DESCONTO10')).rejects.toBeInstanceOf(
      CupomInativoException,
    );
    expect(carrinhoSessaoRepository.definirCupom).not.toHaveBeenCalled();
  });

  it('valida contra o mesmo carrinho persistido (produtoId/quantidade) e repassa o clienteId', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: carrinhoComItens,
      sessionTokenNovo: undefined,
    });

    await useCase.executar('token-1', 'cliente-1', 'desconto10');

    expect(montarCarrinhoUseCase.executar).toHaveBeenCalledWith(
      [{ produtoId: 'produto-1', quantidade: 2 }],
      'desconto10',
      'cliente-1',
    );
  });

  it('salva o cupom (normalizado pra maiúsculo) no carrinho e devolve o sessionToken quando tudo é válido', async () => {
    resolverCarrinhoSessaoUseCase.executar.mockResolvedValue({
      carrinho: carrinhoComItens,
      sessionTokenNovo: undefined,
    });

    const resultado = await useCase.executar('token-1', undefined, 'desconto10');

    expect(carrinhoSessaoRepository.definirCupom).toHaveBeenCalledWith(
      'carrinho-1',
      'DESCONTO10',
      expect.any(Date),
    );
    expect(resultado).toBe('token-1');
  });
});
