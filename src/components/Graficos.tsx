import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PontoDiario, PontoMensal } from "../lib/calculos";
import { dataCurta, dataLonga, eixoReais, mesCurto, nomeMes, pct, reais, reaisCurto } from "../lib/formato";
import { CaixaTooltip, CartaoGrafico, ItemLegenda, LinhaTooltip, TabelaSimples } from "./ui";

const eixo = { fontSize: 11, fill: "var(--ink-2)" };

export function GraficoAcumulado({ serie, mes }: { serie: PontoDiario[]; mes: string }) {
  const temTendencia = serie.some((p) => p.tendencia != null);
  const ultimoReal = [...serie].reverse().find((p) => p.realizado != null);

  return (
    <CartaoGrafico
      className="lg:col-span-2"
      titulo="Venda acumulada x meta"
      subtitulo={`Dia a dia em ${nomeMes(mes)}${temTendencia ? "; a linha tracejada é uma estimativa pelo ritmo médio" : ""}`}
      legenda={
        <>
          <ItemLegenda tipo="linha" cor="var(--series-1)">Realizado</ItemLegenda>
          <ItemLegenda tipo="linha" cor="var(--ref)">Meta (linear)</ItemLegenda>
          {temTendencia && (
            <ItemLegenda tipo="linha" cor="var(--series-1)" tracejado>
              Tendência
            </ItemLegenda>
          )}
        </>
      }
      grafico={
        <div className="h-full min-h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 8, right: 56, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="dia" tickFormatter={dataCurta} tick={eixo} tickLine={false} axisLine={{ stroke: "var(--axis)" }} minTickGap={24} />
              <YAxis tickFormatter={eixoReais} tick={eixo} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <CaixaTooltip titulo={dataLonga(String(label))}>
                      {payload[0].payload.realizado != null && (
                        <LinhaTooltip cor="var(--series-1)" nome="realizado" valor={reaisCurto(payload[0].payload.realizado)} />
                      )}
                      {payload[0].payload.tendencia != null && payload[0].payload.realizado == null && (
                        <LinhaTooltip cor="var(--series-1)" tracejado nome="tendência (estimativa)" valor={reaisCurto(payload[0].payload.tendencia)} />
                      )}
                      <LinhaTooltip cor="var(--ref)" nome="meta" valor={reaisCurto(payload[0].payload.meta)} />
                    </CaixaTooltip>
                  ) : null
                }
              />
              <Line type="monotone" dataKey="meta" stroke="var(--ref)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
              <Line type="monotone" dataKey="tendencia" stroke="var(--series-1)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={false} connectNulls isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="realizado"
                stroke="var(--series-1)"
                strokeWidth={2}
                dot={(p: { cx?: number; cy?: number; payload?: PontoDiario; index?: number }) =>
                  p.payload?.dia === ultimoReal?.dia && p.cx != null && p.cy != null ? (
                    <g key="fim">
                      <circle cx={p.cx} cy={p.cy} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
                      <text x={p.cx + 9} y={p.cy - 8} fontSize={12} fontWeight={600} fill="var(--ink)">
                        {reaisCurto(p.payload!.realizado!)}
                      </text>
                    </g>
                  ) : (
                    <g key={p.index} />
                  )
                }
                activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      }
      tabela={
        <TabelaSimples
          chave={(l) => l.dia}
          linhas={serie}
          colunas={[
            { titulo: "Dia", valor: (l) => dataLonga(l.dia) },
            { titulo: "Realizado acumulado", alinhar: "dir", valor: (l) => (l.realizado != null ? reais(l.realizado) : "–") },
            { titulo: "Meta acumulada", alinhar: "dir", valor: (l) => reais(l.meta) },
            { titulo: "Tendência", alinhar: "dir", valor: (l) => (l.tendencia != null ? reais(l.tendencia) : "–") },
          ]}
        />
      }
    />
  );
}

export function GraficoMensal({ serie }: { serie: PontoMensal[] }) {
  return (
    <CartaoGrafico
      titulo="Evolução mensal"
      subtitulo="Venda realizada contra a meta de cada mês"
      legenda={
        <>
          <ItemLegenda tipo="barra" cor="var(--series-1)">Realizado</ItemLegenda>
          <ItemLegenda tipo="barra" cor="var(--ref)">Meta</ItemLegenda>
        </>
      }
      grafico={
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="mes" tickFormatter={(m) => mesCurto(m)} tick={eixo} tickLine={false} axisLine={{ stroke: "var(--axis)" }} />
              <YAxis tickFormatter={eixoReais} tick={eixo} tickLine={false} axisLine={false} width={56} />
              <Tooltip
                cursor={{ fill: "var(--series-1-soft)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as PontoMensal;
                  return (
                    <CaixaTooltip titulo={nomeMes(p.mes) + (p.parcial ? " (parcial)" : "")}>
                      <LinhaTooltip cor="var(--series-1)" nome="realizado" valor={reaisCurto(p.venda)} />
                      <LinhaTooltip cor="var(--ref)" nome="meta" valor={reaisCurto(p.meta)} />
                      <div className="mt-1 text-ink-2">
                        {p.parcial ? `tendência ${reaisCurto(p.tendencia)} · ${pct((p.tendencia / p.meta) * 100)} da meta` : `${pct((p.venda / p.meta) * 100)} da meta`}
                      </div>
                    </CaixaTooltip>
                  );
                }}
              />
              <Bar dataKey="venda" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
              <Bar dataKey="meta" fill="var(--ref)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
      tabela={
        <TabelaSimples
          chave={(l) => l.mes}
          linhas={serie}
          colunas={[
            { titulo: "Mês", valor: (l) => nomeMes(l.mes) + (l.parcial ? " (parcial)" : "") },
            { titulo: "Realizado", alinhar: "dir", valor: (l) => reais(l.venda) },
            { titulo: "Meta", alinhar: "dir", valor: (l) => reais(l.meta) },
            { titulo: "% da meta", alinhar: "dir", valor: (l) => pct((l.venda / l.meta) * 100) },
            { titulo: "Tendência", alinhar: "dir", valor: (l) => (l.parcial ? reais(l.tendencia) : "–") },
          ]}
        />
      }
    />
  );
}
