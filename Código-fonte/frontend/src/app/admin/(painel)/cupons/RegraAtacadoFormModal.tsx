'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Radio } from '@/components/ui/Radio';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/http';
import {
  atualizarRegraAtacadoAdmin,
  criarRegraAtacadoAdmin,
  type RegraAtacadoAdmin,
  type TipoDescontoAtacado,
} from '@/lib/admin-atacado';
import { listarProdutosAdmin } from '@/lib/admin-produtos';
import { listarCategorias } from '@/lib/categorias';

export interface RegraAtacadoFormModalProps {
  /** null = fechado. undefined = aberto em modo criação. RegraAtacadoAdmin = aberto editando essa regra. */
  regra: RegraAtacadoAdmin | null | undefined;
  aberto: boolean;
  onClose: () => void;
}

type TipoAlvo = 'PRODUTO' | 'CATEGORIA';

interface FormRegra {
  tipoAlvo: TipoAlvo;
  produtoId: string;
  categoriaId: string;
  quantidadeMinima: string;
  tipoDesconto: TipoDescontoAtacado;
  valor: number;
}

function formInicial(regra: RegraAtacadoAdmin | null | undefined): FormRegra {
  return regra
    ? {
        tipoAlvo: regra.produtoId ? 'PRODUTO' : 'CATEGORIA',
        produtoId: regra.produtoId ?? '',
        categoriaId: regra.categoriaId ?? '',
        quantidadeMinima: String(regra.quantidadeMinima),
        tipoDesconto: regra.tipoDesconto,
        valor: regra.valor,
      }
    : {
        tipoAlvo: 'PRODUTO',
        produtoId: '',
        categoriaId: '',
        quantidadeMinima: '',
        tipoDesconto: 'PERCENTUAL',
        valor: 0,
      };
}

export function RegraAtacadoFormModal({ regra, aberto, onClose }: RegraAtacadoFormModalProps) {
  const editando = !!regra;

  return (
    <Modal
      open={aberto}
      onClose={onClose}
      title={editando ? 'Editar regra de atacado' : 'Nova regra de atacado'}
    >
      {/* key força remontar o form (estado fresco) ao trocar de regra/criação —
          mesmo padrão de CupomFormModal. */}
      {aberto && <RegraAtacadoForm key={regra?.id ?? 'novo'} regra={regra} onSalvo={onClose} />}
    </Modal>
  );
}

function RegraAtacadoForm({
  regra,
  onSalvo,
}: {
  regra: RegraAtacadoAdmin | null | undefined;
  onSalvo: () => void;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const editando = !!regra;
  const [form, setForm] = useState<FormRegra>(() => formInicial(regra));
  const [buscaProduto, setBuscaProduto] = useState('');

  // Catálogo inteiro numa página só (126 produtos hoje) — dropdown com filtro de
  // texto client-side é suficiente nesse tamanho, sem precisar de um combobox
  // com busca no servidor (não existe componente pronto pra isso no painel ainda).
  const produtosQuery = useQuery({
    queryKey: ['admin', 'produtos', 'todos'],
    queryFn: () => listarProdutosAdmin({ pagina: 1, limite: 300 }),
    enabled: form.tipoAlvo === 'PRODUTO',
  });
  const categoriasQuery = useQuery({
    queryKey: ['categorias'],
    queryFn: () => listarCategorias(),
    enabled: form.tipoAlvo === 'CATEGORIA',
  });

  const produtosFiltrados = useMemo(() => {
    const produtos = produtosQuery.data?.itens ?? [];
    const termo = buscaProduto.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((produto) =>
      [produto.nome, produto.marca?.nome, produto.pack]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(termo),
    );
  }, [produtosQuery.data, buscaProduto]);

  const mutation = useMutation({
    mutationFn: () => {
      const quantidadeMinima = Number(form.quantidadeMinima);

      if (editando) {
        return atualizarRegraAtacadoAdmin(regra!.id, {
          quantidadeMinima,
          tipoDesconto: form.tipoDesconto,
          valor: form.valor,
        });
      }
      return criarRegraAtacadoAdmin({
        produtoId: form.tipoAlvo === 'PRODUTO' ? form.produtoId : undefined,
        categoriaId: form.tipoAlvo === 'CATEGORIA' ? form.categoriaId : undefined,
        quantidadeMinima,
        tipoDesconto: form.tipoDesconto,
        valor: form.valor,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'regras-atacado'] });
      showToast(editando ? 'Regra atualizada.' : 'Regra criada.', 'success');
      onSalvo();
    },
    onError: (erro) => {
      showToast(erro instanceof ApiError ? erro.message : 'Erro ao salvar a regra.', 'error');
    },
  });

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    mutation.mutate();
  }

  const alvoValido = form.tipoAlvo === 'PRODUTO' ? !!form.produtoId : !!form.categoriaId;

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3.5">
      {editando ? (
        <p className="-mt-1 text-xs text-muted">
          O produto/categoria alvo não pode ser alterado depois de criada. Pra trocar, crie uma
          regra nova e desative esta.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Radio
              name="tipoAlvo"
              label="Por produto"
              checked={form.tipoAlvo === 'PRODUTO'}
              onChange={() => setForm({ ...form, tipoAlvo: 'PRODUTO' })}
            />
            <Radio
              name="tipoAlvo"
              label="Por categoria"
              checked={form.tipoAlvo === 'CATEGORIA'}
              onChange={() => setForm({ ...form, tipoAlvo: 'CATEGORIA' })}
            />
          </div>

          {form.tipoAlvo === 'PRODUTO' ? (
            <div className="flex flex-col gap-1.5">
              <Input
                placeholder="Buscar produto por nome, marca ou embalagem…"
                value={buscaProduto}
                onChange={(e) => setBuscaProduto(e.target.value)}
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-navy">Produto</span>
                <select
                  required
                  value={form.produtoId}
                  onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
                  className="rounded-atlas-sm border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-blue/40"
                >
                  <option value="" disabled>
                    {produtosQuery.isLoading ? 'Carregando…' : 'Selecione um produto'}
                  </option>
                  {produtosFiltrados.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {[produto.nome, produto.marca?.nome, produto.pack]
                        .filter(Boolean)
                        .join(' — ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-navy">Categoria</span>
              <select
                required
                value={form.categoriaId}
                onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                className="rounded-atlas-sm border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-blue/40"
              >
                <option value="" disabled>
                  {categoriasQuery.isLoading ? 'Carregando…' : 'Selecione uma categoria'}
                </option>
                {(categoriasQuery.data ?? []).map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-navy">Tipo de desconto</span>
          <select
            value={form.tipoDesconto}
            onChange={(e) =>
              setForm({ ...form, tipoDesconto: e.target.value as TipoDescontoAtacado })
            }
            className="rounded-atlas-sm border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-blue/40"
          >
            <option value="PERCENTUAL">Percentual (%)</option>
            <option value="VALOR_FIXO">Valor fixo (R$)</option>
          </select>
        </label>
        <Input
          label={form.tipoDesconto === 'PERCENTUAL' ? 'Valor (%)' : 'Valor (R$)'}
          type="number"
          step="0.01"
          min={0}
          required
          value={form.valor}
          onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })}
        />
      </div>

      <Input
        label="Quantidade mínima"
        type="number"
        min={2}
        required
        placeholder="Ex: 12"
        value={form.quantidadeMinima}
        onChange={(e) => setForm({ ...form, quantidadeMinima: e.target.value })}
      />

      <Button type="submit" disabled={mutation.isPending || !alvoValido} className="mt-1">
        {mutation.isPending ? 'Salvando…' : editando ? 'Salvar' : 'Criar'}
      </Button>
    </form>
  );
}
