'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/http';
import {
  atualizarCupomAdmin,
  criarCupomAdmin,
  type CupomAdmin,
  type TipoDescontoCupom,
} from '@/lib/admin-cupons';
import { listarProdutosAdmin } from '@/lib/admin-produtos';
import { listarCategorias } from '@/lib/categorias';

export interface CupomFormModalProps {
  /** null = fechado. undefined = aberto em modo criação. CupomAdmin = aberto editando esse cupom. */
  cupom: CupomAdmin | null | undefined;
  aberto: boolean;
  onClose: () => void;
}

interface FormCupom {
  codigo: string;
  tipoDesconto: TipoDescontoCupom;
  valor: number;
  validoAte: string;
  usoMaximo: string;
  valorMinimoPedido: string;
  limiteUsoPorCliente: string;
  categoriaIds: string[];
  produtoIds: string[];
}

function formInicial(cupom: CupomAdmin | null | undefined): FormCupom {
  return cupom
    ? {
        codigo: cupom.codigo,
        tipoDesconto: cupom.tipoDesconto,
        valor: cupom.valor,
        validoAte: cupom.validoAte ? cupom.validoAte.slice(0, 10) : '',
        usoMaximo: cupom.usoMaximo ? String(cupom.usoMaximo) : '',
        valorMinimoPedido: cupom.valorMinimoPedido ? String(cupom.valorMinimoPedido) : '',
        limiteUsoPorCliente: cupom.limiteUsoPorCliente ? String(cupom.limiteUsoPorCliente) : '',
        categoriaIds: cupom.categoriaIds,
        produtoIds: cupom.produtoIds,
      }
    : {
        codigo: '',
        tipoDesconto: 'PERCENTUAL',
        valor: 0,
        validoAte: '',
        usoMaximo: '',
        valorMinimoPedido: '',
        limiteUsoPorCliente: '',
        categoriaIds: [],
        produtoIds: [],
      };
}

export function CupomFormModal({ cupom, aberto, onClose }: CupomFormModalProps) {
  const editando = !!cupom;

  return (
    <Modal open={aberto} onClose={onClose} title={editando ? 'Editar cupom' : 'Novo cupom'}>
      {/* key força remontar o form (estado fresco) ao trocar de cupom/criação —
          evita useEffect+setState só pra sincronizar com a prop `cupom`. */}
      {aberto && <CupomForm key={cupom?.id ?? 'novo'} cupom={cupom} onSalvo={onClose} />}
    </Modal>
  );
}

function CupomForm({
  cupom,
  onSalvo,
}: {
  cupom: CupomAdmin | null | undefined;
  onSalvo: () => void;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const editando = !!cupom;
  const [form, setForm] = useState<FormCupom>(() => formInicial(cupom));
  const [buscaProduto, setBuscaProduto] = useState('');

  // Catálogo inteiro numa página só (126 produtos hoje) — mesma abordagem de
  // RegraAtacadoFormModal, sem componente de combobox com busca no servidor.
  const produtosQuery = useQuery({
    queryKey: ['admin', 'produtos', 'todos'],
    queryFn: () => listarProdutosAdmin({ pagina: 1, limite: 300 }),
  });
  const categoriasQuery = useQuery({
    queryKey: ['categorias'],
    queryFn: () => listarCategorias(),
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

  function alternarCategoria(id: string) {
    setForm((atual) => ({
      ...atual,
      categoriaIds: atual.categoriaIds.includes(id)
        ? atual.categoriaIds.filter((c) => c !== id)
        : [...atual.categoriaIds, id],
    }));
  }

  function alternarProduto(id: string) {
    setForm((atual) => ({
      ...atual,
      produtoIds: atual.produtoIds.includes(id)
        ? atual.produtoIds.filter((p) => p !== id)
        : [...atual.produtoIds, id],
    }));
  }

  const mutation = useMutation({
    mutationFn: () => {
      const validoAte = form.validoAte
        ? new Date(`${form.validoAte}T23:59:59.000Z`).toISOString()
        : undefined;
      const usoMaximo = form.usoMaximo ? Number(form.usoMaximo) : undefined;
      const valorMinimoPedido = form.valorMinimoPedido ? Number(form.valorMinimoPedido) : undefined;
      const limiteUsoPorCliente = form.limiteUsoPorCliente
        ? Number(form.limiteUsoPorCliente)
        : undefined;

      if (editando) {
        return atualizarCupomAdmin(cupom!.id, {
          tipoDesconto: form.tipoDesconto,
          valor: form.valor,
          validoAte,
          usoMaximo,
          valorMinimoPedido,
          limiteUsoPorCliente,
          categoriaIds: form.categoriaIds,
          produtoIds: form.produtoIds,
        });
      }
      return criarCupomAdmin({
        codigo: form.codigo,
        tipoDesconto: form.tipoDesconto,
        valor: form.valor,
        validoAte,
        usoMaximo,
        valorMinimoPedido,
        limiteUsoPorCliente,
        categoriaIds: form.categoriaIds,
        produtoIds: form.produtoIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'cupons'] });
      showToast(editando ? 'Cupom atualizado.' : 'Cupom criado.', 'success');
      onSalvo();
    },
    onError: (erro) => {
      showToast(erro instanceof ApiError ? erro.message : 'Erro ao salvar cupom.', 'error');
    },
  });

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    mutation.mutate();
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-3.5">
      <Input
        label="Código"
        required
        disabled={editando}
        maxLength={30}
        placeholder="BEMVINDO10"
        value={form.codigo}
        onChange={(e) => setForm({ ...form, codigo: e.target.value })}
      />
      {editando && (
        <p className="-mt-2 text-xs text-muted">
          O código não pode ser alterado depois de criado. Pra trocar, crie um cupom novo e desative
          este.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-navy">Tipo de desconto</span>
          <select
            value={form.tipoDesconto}
            onChange={(e) =>
              setForm({ ...form, tipoDesconto: e.target.value as TipoDescontoCupom })
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

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Válido até"
          type="date"
          value={form.validoAte}
          onChange={(e) => setForm({ ...form, validoAte: e.target.value })}
        />
        <Input
          label="Uso máximo"
          type="number"
          min={1}
          placeholder="Ilimitado"
          value={form.usoMaximo}
          onChange={(e) => setForm({ ...form, usoMaximo: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Valor mínimo do pedido (R$)"
          type="number"
          step="0.01"
          min={0}
          placeholder="Sem mínimo"
          value={form.valorMinimoPedido}
          onChange={(e) => setForm({ ...form, valorMinimoPedido: e.target.value })}
        />
        <Input
          label="Limite de uso por cliente"
          type="number"
          min={1}
          placeholder="Ilimitado"
          value={form.limiteUsoPorCliente}
          onChange={(e) => setForm({ ...form, limiteUsoPorCliente: e.target.value })}
        />
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-[13px] font-bold text-navy">
          Restrição por categoria
          <span className="ml-1 font-normal text-muted">(vazio = vale pra tudo)</span>
        </legend>
        {(categoriasQuery.data ?? []).map((categoria) => (
          <label key={categoria.id} className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={form.categoriaIds.includes(categoria.id)}
              onChange={() => alternarCategoria(categoria.id)}
              className="h-4 w-4 rounded border-line text-navy focus:ring-blue/40"
            />
            {categoria.nome}
          </label>
        ))}
        {categoriasQuery.isLoading && <p className="text-[13px] text-muted">Carregando…</p>}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-bold text-navy">
          Restrição por produto
          <span className="ml-1 font-normal text-muted">(vazio = vale pra tudo)</span>
        </legend>
        <Input
          placeholder="Buscar produto por nome, marca ou embalagem…"
          value={buscaProduto}
          onChange={(e) => setBuscaProduto(e.target.value)}
        />
        {form.produtoIds.length > 0 && (
          <p className="text-[12px] text-muted">
            {form.produtoIds.length} produto(s) selecionado(s)
          </p>
        )}
        <div className="flex max-h-[180px] flex-col gap-2 overflow-y-auto rounded-atlas-sm border border-line p-2.5">
          {produtosQuery.isLoading && <p className="text-[13px] text-muted">Carregando…</p>}
          {!produtosQuery.isLoading && produtosFiltrados.length === 0 && (
            <p className="text-[13px] text-muted">Nenhum produto encontrado.</p>
          )}
          {produtosFiltrados.map((produto) => (
            <label key={produto.id} className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={form.produtoIds.includes(produto.id)}
                onChange={() => alternarProduto(produto.id)}
                className="h-4 w-4 shrink-0 rounded border-line text-navy focus:ring-blue/40"
              />
              {[produto.nome, produto.marca?.nome, produto.pack].filter(Boolean).join(' — ')}
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" disabled={mutation.isPending} className="mt-1">
        {mutation.isPending ? 'Salvando…' : editando ? 'Salvar' : 'Criar'}
      </Button>
    </form>
  );
}
