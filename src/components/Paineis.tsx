import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, CircleCheck, Lightbulb, OctagonAlert, TriangleAlert } from "lucide-react";
import type { Alerta, Linha } from "../lib/calculos";
import { statusCategoria, statusTendencia } from "../lib/calculos";
import { pct, pp, reais, reaisCurto } from "../lib/formato";
import { CartaoGrafico, StatusChip, TabelaSimples } from "./ui";

const COR_STATUS = { bom: "var(--series-1)", atencao: "var(--warning)", abaixo: "var(--serious)", critico: "var(--critical)", "sem-meta": "var(--ink-3)" };

export function RankingUnidades({ linhas, selecionada, aoSelecionar }: { linhas: Linha[]; selecionada: string; aoSelecionar: (nome: string) => void }) {
  const escala = Math.max(120, ...linhas.map((l) => l.tendenciaPct || 0));
  return (
    <CartaoGrafico
      titulo="Unidades por tendência"
      subtitulo="Projeção de fechamento em % da meta. Clique para filtrar."
      grafico={
        <ul className="flex flex-col gap-1">
          {linhas.map((l) => {
            const st = statusTendencia(l.tendenciaPct);
            const ativo = selecionada === l.nome;
            return (
              <li key={l.nome}>
                <button
                  onClick={() => aoSelecionar(ativo ? "" : l.nome)}
                  aria-pressed={ativo}
                  className={`w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2 ${ativo ? "bg-surface-2 ring-1 ring-[var(--series-1)]" : ""}`}
                >
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">
                      {l.nome} <span className="text-xs font-normal text-ink-3">{l.canal}</span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">{pct(l.tendenciaPct)}</span>
                  </div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-surface-2 ring-1 ring-[var(--ring)] ring-inset">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min((l.tendenciaPct || 0) / escala, 1) * 100}%`, background: COR_STATUS[st] }} />
                    <div className="absolute -top-0.5 h-3 w-px bg-ink-2" style={{ left: `${(100 / escala) * 100}%` }} title="100% da meta" />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-ink-2">
                    <span>
                      {reaisCurto(l.venda)} de {reaisCurto(l.meta)} · margem {pct(l.margem)}
                    </span>
                    <StatusChip status={st} compacto />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      }
      tabela={
        <TabelaSimples
          chave={(l) => l.nome}
          linhas={linhas}
          colunas={[
            { titulo: "Unidade", valor: (l) => l.nome },
            { titulo: "Canal", valor: (l) => l.canal },
            { titulo: "Venda", alinhar: "dir", valor: (l) => reais(l.venda) },
            { titulo: "Meta", alinhar: "dir", valor: (l) => reais(l.meta) },
            { titulo: "Tendência", alinhar: "dir", valor: (l) => pct(l.tendenciaPct) },
            { titulo: "Margem", alinhar: "dir", valor: (l) => pct(l.margem) },
          ]}
        />
      }
    />
  );
}

type ColunaOrd = "nome" | "venda" | "atingimento" | "tendenciaPct" | "margem" | "deltaMargem";

/** fundo divergente: vermelho (abaixo da meta) ↔ cinza (na meta) ↔ azul (acima) */
function fundoDelta(d: number) {
  if (!Number.isFinite(d)) return undefined;
  const t = Math.min(Math.abs(d) / 6, 1) * 55;
  const polo = d < 0 ? "var(--div-neg)" : "var(--div-pos)";
  return `color-mix(in srgb, ${polo} ${t}%, var(--div-mid))`;
}

export function TabelaCategorias({ linhas, selecionada, aoSelecionar }: { linhas: Linha[]; selecionada: string; aoSelecionar: (nome: string) => void }) {
  const [ord, setOrd] = useState<{ col: ColunaOrd; desc: boolean }>({ col: "venda", desc: true });
  const ordenadas = useMemo(() => {
    const s = [...linhas].sort((a, z) => {
      const va = a[ord.col];
      const vz = z[ord.col];
      const c = typeof va === "string" ? va.localeCompare(vz as string, "pt-BR") : (va as number) - (vz as number);
      return ord.desc ? -c : c;
    });
    return s;
  }, [linhas, ord]);

  const th = (col: ColunaOrd, titulo: string, dir = true) => (
    <th className={`px-2 py-2 font-medium ${dir ? "text-right" : "text-left"}`} aria-sort={ord.col === col ? (ord.desc ? "descending" : "ascending") : "none"}>
      <button className="inline-flex items-center gap-0.5 hover:text-ink" onClick={() => setOrd((o) => ({ col, desc: o.col === col ? !o.desc : true }))}>
        {titulo}
        {ord.col === col && (ord.desc ? <ChevronDown size={14} aria-hidden /> : <ChevronUp size={14} aria-hidden />)}
      </button>
    </th>
  );

  return (
    <section className="card entrar p-5 lg:col-span-2">
      <header className="mb-3">
        <h2 className="text-[15px] font-semibold">Categorias</h2>
        <p className="mt-0.5 text-xs text-ink-2">
          Venda, tendência e margem por categoria. Δ margem vai do vermelho (abaixo da meta) ao azul (acima); o status considera venda e margem. Clique numa linha para filtrar.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="tabular w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              {th("nome", "Categoria", false)}
              {th("venda", "Venda")}
              <th className="px-2 py-2 text-right font-medium">Meta</th>
              {th("atingimento", "% meta")}
              {th("tendenciaPct", "Tendência")}
              {th("margem", "Margem")}
              <th className="px-2 py-2 text-right font-medium">Meta margem</th>
              {th("deltaMargem", "Δ margem")}
              <th className="px-2 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((l) => {
              const ativo = selecionada === l.nome;
              return (
                <tr
                  key={l.nome}
                  onClick={() => aoSelecionar(ativo ? "" : l.nome)}
                  className={`cursor-pointer border-b border-line last:border-0 hover:bg-surface-2 ${ativo ? "bg-surface-2" : ""}`}
                >
                  <td className="px-2 py-2 font-medium">
                    <button className="text-left" onClick={(e) => (e.stopPropagation(), aoSelecionar(ativo ? "" : l.nome))} aria-pressed={ativo}>
                      {l.nome}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right">{reaisCurto(l.venda)}</td>
                  <td className="px-2 py-2 text-right text-ink-2">{reaisCurto(l.meta)}</td>
                  <td className="px-2 py-2 text-right">{pct(l.atingimento)}</td>
                  <td className="px-2 py-2 text-right">{pct(l.tendenciaPct)}</td>
                  <td className={`px-2 py-2 text-right font-medium ${l.margem < 0 ? "text-critical-ink" : ""}`}>{pct(l.margem)}</td>
                  <td className="px-2 py-2 text-right text-ink-2">{pct(l.metaMargem)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="inline-block min-w-[78px] rounded-md px-2 py-0.5" style={{ background: fundoDelta(l.deltaMargem) }}>
                      {pp(l.deltaMargem)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <StatusChip {...statusCategoria(l)} compacto />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const ICONE_ALERTA = {
  critico: { Icone: OctagonAlert, cor: "var(--critical)", rotulo: "Crítico" },
  atencao: { Icone: TriangleAlert, cor: "var(--warning)", rotulo: "Atenção" },
  positivo: { Icone: CircleCheck, cor: "var(--good)", rotulo: "Positivo" },
};

export function PainelAlertas({ alertas }: { alertas: Alerta[] }) {
  return (
    <section className="card entrar p-5">
      <header className="mb-3 flex items-center gap-2">
        <Lightbulb size={18} className="text-ink-2" aria-hidden />
        <div>
          <h2 className="text-[15px] font-semibold">Alertas automáticos</h2>
          <p className="mt-0.5 text-xs text-ink-2">Gerados a partir dos dados filtrados</p>
        </div>
      </header>
      {alertas.length === 0 ? (
        <p className="text-sm text-ink-2">Nada fora do esperado neste recorte.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {alertas.map((a, i) => {
            const { Icone, cor, rotulo } = ICONE_ALERTA[a.nivel];
            return (
              <li key={i} className="flex gap-2.5">
                <Icone size={18} strokeWidth={2.4} style={{ color: cor }} className="mt-0.5 shrink-0" aria-label={rotulo} />
                <div className="text-sm">
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-ink-2">{a.texto}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
