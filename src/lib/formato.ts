const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const num0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const reais = (v: number) => brl.format(v);

/** R$ 1,24 mi · R$ 845 mil · R$ 920 */
export function reaisCurto(v: number): string {
  const a = Math.abs(v);
  const sinal = v < 0 ? "-" : "";
  if (a >= 1e6) {
    const casas = a < 1e7 ? 2 : 1;
    const t = (a / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).replace(/,?0+$/, "");
    return `${sinal}R$ ${t} mi`;
  }
  if (a >= 1e3) return `${sinal}R$ ${num0.format(a / 1e3)} mil`;
  return `${sinal}R$ ${num0.format(a)}`;
}

/** eixo: 0 · 200 mil · 1,2 mi */
export function eixoReais(v: number): string {
  if (v === 0) return "0";
  if (Math.abs(v) >= 1e6) return `${num1.format(v / 1e6).replace(/,0$/, "")} mi`;
  return `${num0.format(v / 1e3)} mil`;
}

export const pct = (v: number, casas = 1) =>
  Number.isFinite(v) ? `${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%` : "–";

/** diferença em pontos percentuais, com sinal */
export const pp = (v: number) =>
  Number.isFinite(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.` : "–";

export const variacao = (v: number) =>
  Number.isFinite(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "–";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const nomeMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
};
export const mesCurto = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  return `${MESES_CURTOS[m - 1]}/${String(a).slice(2)}`;
};
export const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const dataLonga = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
