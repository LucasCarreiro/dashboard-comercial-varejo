import Papa from "papaparse";

export type Venda = {
  data: string; // AAAA-MM-DD
  canal: string;
  unidade: string;
  categoria: string;
  venda: number;
  custo: number;
};

export type Meta = {
  mes: string; // AAAA-MM
  canal: string;
  unidade: string;
  categoria: string;
  metaVenda: number;
  metaMargem: number; // %
};

export type Base = {
  vendas: Venda[];
  metas: Meta[];
  origem: "demo" | "importado";
};

const COLUNAS_VENDAS = ["data", "canal", "unidade", "categoria", "venda", "custo"];
const COLUNAS_METAS = ["mes", "canal", "unidade", "categoria", "meta_venda", "meta_margem"];

type Linha = Record<string, string>;

function ler(texto: string): { linhas: Linha[]; colunas: string[] } {
  const r = Papa.parse<Linha>(texto.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return { linhas: r.data, colunas: r.meta.fields ?? [] };
}

// aceita "1234.56" e "1.234,56"
function numero(v: string | undefined): number {
  if (v == null) return NaN;
  const s = v.trim();
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(s) || /^-?\d+,\d+$/.test(s)) {
    return Number(s.replace(/\./g, "").replace(",", "."));
  }
  return Number(s);
}

export type TipoArquivo = "vendas" | "metas" | "desconhecido";

export function identificar(texto: string): TipoArquivo {
  const { colunas } = ler(texto.split("\n").slice(0, 2).join("\n"));
  if (COLUNAS_VENDAS.every((c) => colunas.includes(c))) return "vendas";
  if (COLUNAS_METAS.every((c) => colunas.includes(c))) return "metas";
  return "desconhecido";
}

export function lerVendas(texto: string): Venda[] {
  const { linhas } = ler(texto);
  const out: Venda[] = [];
  for (const l of linhas) {
    const venda = numero(l.venda);
    const custo = numero(l.custo);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(l.data ?? "") || !Number.isFinite(venda) || !Number.isFinite(custo)) continue;
    out.push({ data: l.data, canal: l.canal.trim(), unidade: l.unidade.trim(), categoria: l.categoria.trim(), venda, custo });
  }
  return out;
}

export function lerMetas(texto: string): Meta[] {
  const { linhas } = ler(texto);
  const out: Meta[] = [];
  for (const l of linhas) {
    const metaVenda = numero(l.meta_venda);
    const metaMargem = numero(l.meta_margem);
    if (!/^\d{4}-\d{2}$/.test(l.mes ?? "") || !Number.isFinite(metaVenda)) continue;
    out.push({
      mes: l.mes,
      canal: l.canal.trim(),
      unidade: l.unidade.trim(),
      categoria: l.categoria.trim(),
      metaVenda,
      metaMargem: Number.isFinite(metaMargem) ? metaMargem : 0,
    });
  }
  return out;
}

export async function carregarDemo(): Promise<Base> {
  const base = import.meta.env.BASE_URL;
  const [v, m] = await Promise.all([
    fetch(`${base}dados/vendas.csv`).then((r) => r.text()),
    fetch(`${base}dados/metas.csv`).then((r) => r.text()),
  ]);
  return { vendas: lerVendas(v), metas: lerMetas(m), origem: "demo" };
}
