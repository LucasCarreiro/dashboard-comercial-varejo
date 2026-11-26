// Gera os dados FICTÍCIOS usados na demonstração do painel.
// Nenhum número aqui vem de empresa real: tudo sai de um gerador
// pseudoaleatório com semente fixa, então o resultado é sempre o mesmo.
//
// Uso: npm run dados

import { writeFileSync, mkdirSync } from "node:fs";

// ---------- gerador pseudoaleatório com semente (mulberry32) ----------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260618);
const ruido = (amp) => 1 + (rand() * 2 - 1) * amp;

// ---------- cadastro fictício ----------
const unidades = [
  { canal: "Varejo", nome: "Loja 01 · Centro", porte: 1.35, desempenho: [1.02, 1.04, 1.01, 1.06] },
  { canal: "Varejo", nome: "Loja 02 · Zona Norte", porte: 1.0, desempenho: [0.98, 1.01, 0.97, 1.03] },
  { canal: "Varejo", nome: "Loja 03 · Zona Sul", porte: 1.15, desempenho: [0.95, 0.93, 0.9, 0.88] },
  { canal: "Varejo", nome: "Loja 04 · Zona Leste", porte: 0.8, desempenho: [1.0, 1.05, 1.08, 1.1] },
  { canal: "Varejo", nome: "Loja 05 · Litoral", porte: 0.7, desempenho: [1.08, 0.99, 0.96, 1.12] },
  { canal: "Venda externa", nome: "Rota 01 · Capital", porte: 1.6, desempenho: [1.0, 0.97, 1.03, 0.99] },
  { canal: "Venda externa", nome: "Rota 02 · Interior", porte: 1.1, desempenho: [1.04, 1.07, 1.1, 1.09] },
  { canal: "Venda externa", nome: "Rota 03 · Sertão", porte: 0.75, desempenho: [0.92, 0.95, 0.94, 0.91] },
];

// venda média diária numa loja de porte 1 e margem bruta base (%).
// margemMes = ajuste em pontos percentuais em cada mês (mar, abr, mai, jun).
const categorias = [
  { nome: "Arroz", base: 2300, margem: 8.5, margemMes: [0, -1.5, -4.2, -9.6] },
  { nome: "Feijão", base: 1500, margem: 11, margemMes: [0, 0.6, 1.1, 0.4] },
  { nome: "Açúcar", base: 950, margem: 9, margemMes: [0, -0.4, 0.2, -0.8] },
  { nome: "Café", base: 1650, margem: 15.5, margemMes: [0, -1.2, -2.6, -3.1] },
  { nome: "Óleo de soja", base: 1150, margem: 7, margemMes: [0, 1.4, 2.9, 4.2] },
  { nome: "Azeite", base: 720, margem: 21, margemMes: [0, 0.8, -0.5, 1.6] },
  { nome: "Leite em pó", base: 1350, margem: 6, margemMes: [0, -2.1, -6.4, -11.8] },
  { nome: "Leite UHT", base: 1550, margem: 5.5, margemMes: [0, 0.3, -0.7, 0.9] },
  { nome: "Massas", base: 820, margem: 18, margemMes: [0, 0.4, 0.9, 1.2] },
  { nome: "Farinha de trigo", base: 640, margem: 12, margemMes: [0, -0.6, -1.3, -0.2] },
];

// externa vende em volume (atacado) com margem menor
const fatorCanal = { Varejo: { venda: 1, margem: 0 }, "Venda externa": { venda: 1.25, margem: -2.2 } };

const meses = ["2026-03", "2026-04", "2026-05", "2026-06"];
const dataBase = "2026-06-18"; // último dia com movimento (mês de junho ainda aberto)
const crescimentoMeta = [1.04, 1.05, 1.05, 1.06];

const diasUteis = (mes) => {
  const [a, m] = mes.split("-").map(Number);
  const dias = [];
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(Date.UTC(a, m - 1, d));
    if (dt.getUTCMonth() !== m - 1) break;
    if (dt.getUTCDay() !== 0) dias.push(dt.toISOString().slice(0, 10)); // segunda a sábado
  }
  return dias;
};

const vendas = ["data,canal,unidade,categoria,venda,custo"];
const metas = ["mes,canal,unidade,categoria,meta_venda,meta_margem"];

meses.forEach((mes, iMes) => {
  const dias = diasUteis(mes);
  for (const u of unidades) {
    for (const c of categorias) {
      const fc = fatorCanal[u.canal];
      const mediaDia = c.base * u.porte * fc.venda;
      // meta: média esperada × crescimento pedido × dias úteis do mês inteiro
      const metaVenda = mediaDia * crescimentoMeta[iMes] * dias.length * ruido(0.03);
      const metaMargem = Math.round((c.margem + fc.margem) * 10) / 10;
      metas.push([mes, u.canal, u.nome, c.nome, metaVenda.toFixed(2), metaMargem.toFixed(1)].join(","));

      for (const dia of dias) {
        if (dia > dataBase) break;
        const d = new Date(dia + "T12:00:00Z");
        const diaMes = d.getUTCDate();
        const sabado = d.getUTCDay() === 6;
        let f = 1;
        if (diaMes <= 10) f *= 1.14; // início do mês (salário)
        if (diaMes >= 25) f *= 0.92;
        if (sabado) f *= u.canal === "Varejo" ? 1.22 : 0.45; // externa quase não roda no sábado
        const venda = mediaDia * u.desempenho[iMes] * f * ruido(0.18);
        const margemPct = c.margem + fc.margem + c.margemMes[iMes] + (rand() * 2 - 1) * 1.6;
        const custo = venda * (1 - margemPct / 100);
        vendas.push([dia, u.canal, u.nome, c.nome, venda.toFixed(2), custo.toFixed(2)].join(","));
      }
    }
  }
});

mkdirSync("public/dados", { recursive: true });
writeFileSync("public/dados/vendas.csv", vendas.join("\n") + "\n");
writeFileSync("public/dados/metas.csv", metas.join("\n") + "\n");
console.log(`vendas.csv: ${vendas.length - 1} linhas | metas.csv: ${metas.length - 1} linhas`);
