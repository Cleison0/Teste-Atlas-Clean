import { useEffect, useState } from 'react';

/** Devolve `valor` só depois que ele fica parado por `atrasoMs` — usado no campo de
 * busca do catálogo pra não disparar uma query a cada tecla. */
export function useDebounce<T>(valor: T, atrasoMs: number): T {
  const [valorComAtraso, setValorComAtraso] = useState(valor);

  useEffect(() => {
    const id = setTimeout(() => setValorComAtraso(valor), atrasoMs);
    return () => clearTimeout(id);
  }, [valor, atrasoMs]);

  return valorComAtraso;
}
