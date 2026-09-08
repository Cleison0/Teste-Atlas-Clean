import { Injectable } from '@nestjs/common';
import { Produto } from '../domain/produto.entity';
import { ProdutoRepository } from '../domain/produto.repository';

@Injectable()
export class ListarProdutosMaisVendidosUseCase {
  constructor(private readonly produtoRepository: ProdutoRepository) {}

  async executar(limite: number): Promise<Produto[]> {
    return this.produtoRepository.listarMaisVendidos(limite);
  }
}
