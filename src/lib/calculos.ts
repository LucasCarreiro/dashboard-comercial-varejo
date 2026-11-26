import type { Base } from "./dados";
import { pct, pp, reaisCurto } from "./formato";

export type Filtros = { mes: string; canal: string; unidade: string; categoria: string }; // "" = todos

type Chave = { canal: string; unidade: string; categoria: string };
type Dimensao = "canal" | "unidade" | "categoria";

const passa = (f: Filtros, ignorar?: Dimensao) => (r: Chave) =>
  (ignorar === "canal" || !f.canal || r.canal === f.canal) &&
  (ignorar === "unidade" || !f.unidade || r.unidade === f.unidade) &&
  (ignorar === "categoria" || !f.categoria || r.categoria === f.categoria);

const unicos = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "pt-BR"));

/** dias úteis do mês: segunda a sábado (feriados não são considerados) */
export function diasUteis(mes: string): string[] {
  const [a, m] = mes.split("-").map(Number);
  const dias: string[] = [];
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(a, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) break;
    if (dt.getUTCDay() !== 0) dias.push(dt.toISOString().slice(0, 10));
  }
  return dias;
}

export function mesAnterior(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

export const mesesDisponiveis = (b: Base) => unicos(b.vendas.map((v) => v.data.slice(0, 7)));

export function opcoes(b: Base, f: Filtros) {
  const canais = unicos(b.vendas.map((v) => v.canal));
  const unidades = unicos(b.vendas.filter((v) => !f.canal || v.canal === f.canal).map((v) => v.unidade));
  const categorias = unicos(b.vendas.map((v) => v.categoria));
  return { canais, unidades, categorias };
}

export type Calendario = {
  dias: string[];
  total: number;
  decorridos: number;
  restantes: number;
  ultimoDia: string;
  fechado: boolean;
};

export function calendario(b: Base, mes: string): Calendario {
  const dias = diasUteis(mes);
  let ultimoDia = "";
  for (const v of b.vendas) if (v.data.startsWith(mes) && v.data > ultimoDia) ultimoDia = v.data;
  if (!ultimoDia) ultimoDia = dias[0];
  const decorridos = Math.max(1, dias.filter((d) => d <= ultimoDia).length);
  const total = dias.length;
  return { dias, total, decorridos, restantes: total - decorridos, ultimoDia, fechado: decorridos >= total };
}

type Soma = { venda: number; custo: number; meta: number; metaMargemPond: number };
const zero = (): Soma => ({ venda: 0, custo: 0, meta: 0, metaMargemPond: 0 });
const margemDe = (s: Soma) => (s.venda > 0 ? ((s.venda - s.custo) / s.venda) * 100 : NaN);
const metaMargemDe = (s: Soma) => (s.meta > 0 ? s.metaMargemPond / s.meta : NaN);

function somar(b: Base, f: Filtros, mes: string, ignorar?: Dimensao, ate?: string): Soma {
  const s = zero();
  const ok = passa(f, ignorar);
  for (const v of b.vendas) {
    if (!v.data.startsWith(mes) || (ate && v.data > ate) || !ok(v)) continue;
    s.venda += v.venda;
    s.custo += v.custo;
  }
  for (const m of b.metas) {
    if (m.mes !== mes || !ok(m)) continue;
    s.meta += m.metaVenda;
    s.metaMargemPond += m.metaVenda * m.metaMargem;
  }
  return s;
}

const projetar = (venda: number, c: Calendario) => (c.fechado ? venda : (venda / c.decorridos) * c.total);

export type Resumo = {
  venda: number;
  meta: number;
  margem: number;
  metaMargem: number;
  atingimento: number;
  tendencia: number;
  tendenciaPct: number;
  mediaDia: number;
  metaDiaria: number;
  necessarioDia: number;
  ultimoDiaVenda: number;
  anteriorMesmoPeriodo: number;
  variacaoAnterior: number;
  cal: Calendario;
};

export function resumir(b: Base, f: Filtros): Resumo {
  const cal = calendario(b, f.mes);
  const s = somar(b, f, f.mes);
  const tendencia = projetar(s.venda, cal);

  let ultimoDiaVenda = 0;
  const ok = passa(f);
  for (const v of b.vendas) if (v.data === cal.ultimoDia && ok(v)) ultimoDiaVenda += v.venda;

  // mesmo número de dias úteis no mês anterior
  const ant = mesAnterior(f.mes);
  const diasAnt = diasUteis(ant).slice(0, cal.decorridos);
  const temAnterior = b.vendas.some((v) => v.data.startsWith(ant));
  const anterior = temAnterior ? somar(b, f, ant, undefined, diasAnt[diasAnt.length - 1]).venda : NaN;

  return {
    venda: s.venda,
    meta: s.meta,
    margem: margemDe(s),
    metaMargem: metaMargemDe(s),
    atingimento: s.meta > 0 ? (s.venda / s.meta) * 100 : NaN,
    tendencia,
    tendenciaPct: s.meta > 0 ? (tendencia / s.meta) * 100 : NaN,
    mediaDia: s.venda / cal.decorridos,
    metaDiaria: s.meta / cal.total,
    necessarioDia: cal.restantes > 0 ? Math.max(0, s.meta - s.venda) / cal.restantes : 0,
    ultimoDiaVenda,
    anteriorMesmoPeriodo: anterior,
    variacaoAnterior: anterior > 0 ? (s.venda / anterior - 1) * 100 : NaN,
    cal,
  };
}

export type PontoDiario = { dia: string; realizado?: number; meta: number; tendencia?: number };

export function serieDiaria(b: Base, f: Filtros, r: Resumo): PontoDiario[] {
  const { cal } = r;
  const porDia = new Map<string, number>();
  const ok = passa(f);
  for (const v of b.vendas) if (v.data.startsWith(f.mes) && ok(v)) porDia.set(v.data, (porDia.get(v.data) ?? 0) + v.venda);

  let acum = 0;
  return cal.dias.map((dia, i) => {
    const p: PontoDiario = { dia, meta: r.metaDiaria * (i + 1) };
    if (dia <= cal.ultimoDia) {
      acum += porDia.get(dia) ?? 0;
      p.realizado = acum;
    }
    if (!cal.fechado && i + 1 >= cal.decorridos) p.tendencia = r.venda + r.mediaDia * (i + 1 - cal.decorridos);
    return p;
  });
}

export type PontoMensal = { mes: string; venda: number; meta: number; tendencia: number; parcial: boolean };

export function serieMensal(b: Base, f: Filtros): PontoMensal[] {
  return mesesDisponiveis(b).map((mes) => {
    const cal = calendario(b, mes);
    const s = somar(b, f, mes);
    return { mes, venda: s.venda, meta: s.meta, tendencia: projetar(s.venda, cal), parcial: !cal.fechado };
  });
}

export type Linha = {
  nome: string;
  canal: string;
  venda: number;
  meta: number;
  atingimento: number;
  tendencia: number;
  tendenciaPct: number;
  margem: number;
  metaMargem: number;
  deltaMargem: number;
};

/** uma linha por unidade ou categoria; o filtro da própria dimensão é ignorado para permitir comparar */
export function porDimensao(b: Base, f: Filtros, dim: "unidade" | "categoria"): Linha[] {
  const cal = calendario(b, f.mes);
  const ok = passa(f, dim);
  const grupos = new Map<string, Soma & { canal: string }>();
  const pegar = (nome: string, canal: string) => {
    let g = grupos.get(nome);
    if (!g) grupos.set(nome, (g = { ...zero(), canal }));
    return g;
  };
  for (const v of b.vendas) {
    if (!v.data.startsWith(f.mes) || !ok(v)) continue;
    const g = pegar(v[dim], v.canal);
    g.venda += v.venda;
    g.custo += v.custo;
  }
  for (const m of b.metas) {
    if (m.mes !== f.mes || !ok(m)) continue;
    const g = pegar(m[dim], m.canal);
    g.meta += m.metaVenda;
    g.metaMargemPond += m.metaVenda * m.metaMargem;
  }
  return [...grupos.entries()]
    .map(([nome, s]) => {
      const tendencia = projetar(s.venda, cal);
      const margem = margemDe(s);
      const metaMargem = metaMargemDe(s);
      return {
        nome,
        canal: s.canal,
        venda: s.venda,
        meta: s.meta,
        atingimento: s.meta > 0 ? (s.venda / s.meta) * 100 : NaN,
        tendencia,
        tendenciaPct: s.meta > 0 ? (tendencia / s.meta) * 100 : NaN,
        margem,
        metaMargem,
        deltaMargem: margem - metaMargem,
      };
    })
    .sort((a, z) => (z.tendenciaPct || 0) - (a.tendenciaPct || 0));
}

export type Status = "bom" | "atencao" | "abaixo" | "critico" | "sem-meta";

export function statusTendencia(p: number): Status {
  if (!Number.isFinite(p)) return "sem-meta";
  if (p >= 100) return "bom";
  if (p >= 95) return "atencao";
  if (p >= 90) return "abaixo";
  return "critico";
}

/** status da categoria: o pior entre o ritmo de venda e a margem */
export function statusCategoria(l: Linha): { status: Status; rotulo?: string } {
  if (l.margem < 0) return { status: "critico", rotulo: "Margem negativa" };
  const venda = statusTendencia(l.tendenciaPct);
  const ordem: Status[] = ["sem-meta", "bom", "atencao", "abaixo", "critico"];
  if (l.deltaMargem <= -2 && ordem.indexOf(venda) < ordem.indexOf("atencao")) return { status: "atencao", rotulo: "Margem baixa" };
  return { status: venda };
}

export type Alerta = { nivel: "critico" | "atencao" | "positivo"; titulo: string; texto: string };

/** alertas calculados a partir dos dados filtrados — nada é escrito à mão */
export function gerarAlertas(r: Resumo, unidades: Linha[], categorias: Linha[]): Alerta[] {
  const out: Alerta[] = [];

  for (const c of categorias.filter((c) => c.margem < 0).sort((a, z) => a.margem - z.margem)) {
    out.push({
      nivel: "critico",
      titulo: `${c.nome}: margem negativa`,
      texto: `Margem de ${pct(c.margem)} contra meta de ${pct(c.metaMargem)}. Cada R$ 100 vendidos geram prejuízo bruto; revisar preço de venda ou custo de compra.`,
    });
  }

  const margemBaixa = categorias.filter((c) => c.margem >= 0 && c.deltaMargem <= -2).sort((a, z) => a.deltaMargem - z.deltaMargem);
  if (margemBaixa.length) {
    out.push({
      nivel: "atencao",
      titulo: "Margem abaixo da meta",
      texto: margemBaixa.map((c) => `${c.nome} (${pp(c.deltaMargem)})`).join(", ") + ".",
    });
  }

  const criticas = unidades.filter((u) => statusTendencia(u.tendenciaPct) === "critico");
  if (criticas.length) {
    out.push({
      nivel: "critico",
      titulo: criticas.length === 1 ? "Unidade com tendência abaixo de 90%" : `${criticas.length} unidades com tendência abaixo de 90%`,
      texto: criticas.map((u) => `${u.nome} (${pct(u.tendenciaPct)} da meta)`).join(", ") + ".",
    });
  }

  if (!r.cal.fechado && r.meta > 0 && r.necessarioDia > 0) {
    const esforco = (r.necessarioDia / r.mediaDia - 1) * 100;
    out.push({
      nivel: esforco > 10 ? "atencao" : "positivo",
      titulo: "Ritmo necessário para bater a meta",
      texto: `Faltam ${reaisCurto(r.meta - r.venda)} em ${r.cal.restantes} dias úteis: ${reaisCurto(r.necessarioDia)} por dia, ${esforco >= 0 ? `${pct(esforco)} acima` : `${pct(-esforco)} abaixo`} da média atual.`,
    });
  }

  const melhor = unidades.find((u) => Number.isFinite(u.tendenciaPct));
  if (melhor && melhor.tendenciaPct >= 100) {
    out.push({
      nivel: "positivo",
      titulo: `Destaque: ${melhor.nome}`,
      texto: `Tendência de ${pct(melhor.tendenciaPct)} da meta, com margem de ${pct(melhor.margem)}.`,
    });
  }

  const oportunidade = [...categorias].filter((c) => c.deltaMargem > 2).sort((a, z) => z.deltaMargem - a.deltaMargem)[0];
  if (oportunidade) {
    out.push({
      nivel: "positivo",
      titulo: `Oportunidade: ${oportunidade.nome}`,
      texto: `Margem de ${pct(oportunidade.margem)}, ${pp(oportunidade.deltaMargem)} acima da meta. Espaço para ação de volume ou para compensar categorias pressionadas.`,
    });
  }

  return out;
}

export type CelulaMargem = { margem: number; metaMargem: number; delta: number; venda: number };

/** margem de cada categoria em cada mês (ignora os filtros de mês e categoria) */
export function margemCategoriaMes(b: Base, f: Filtros) {
  const meses = mesesDisponiveis(b);
  const categorias = unicos(b.vendas.map((v) => v.categoria));
  const celulas = new Map<string, CelulaMargem>();
  for (const mes of meses)
    for (const categoria of categorias) {
      const s = somar(b, { ...f, categoria }, mes);
      const margem = margemDe(s);
      const metaMargem = metaMargemDe(s);
      celulas.set(`${categoria}|${mes}`, { margem, metaMargem, delta: margem - metaMargem, venda: s.venda });
    }
  return { meses, categorias, celulas };
}
