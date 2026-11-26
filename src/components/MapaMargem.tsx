import { useState } from "react";
import type { CelulaMargem } from "../lib/calculos";
import { mesCurto, nomeMes, pct, pp, reaisCurto } from "../lib/formato";
import { CartaoGrafico, TabelaSimples } from "./ui";

function fundo(d: number) {
  if (!Number.isFinite(d)) return "var(--surface-2)";
  const t = Math.min(Math.abs(d) / 8, 1) * 60;
  return `color-mix(in srgb, ${d < 0 ? "var(--div-neg)" : "var(--div-pos)"} ${t}%, var(--div-mid))`;
}

export function MapaMargem({
  meses,
  categorias,
  celulas,
  mesAtual,
}: {
  meses: string[];
  categorias: string[];
  celulas: Map<string, CelulaMargem>;
  mesAtual: string;
}) {
  const [foco, setFoco] = useState<{ cat: string; mes: string } | null>(null);
  const atual = foco ? celulas.get(`${foco.cat}|${foco.mes}`) : null;

  const linhasTabela = categorias.flatMap((cat) => meses.map((mes) => ({ cat, mes, c: celulas.get(`${cat}|${mes}`)! })));

  return (
    <CartaoGrafico
      className="lg:col-span-2"
      titulo="Margem por categoria, mês a mês"
      subtitulo="Cada célula mostra a margem bruta; a cor mostra a distância da meta de margem"
      legenda={
        <span className="inline-flex items-center gap-2">
          abaixo da meta
          <span
            className="inline-block h-2.5 w-28 rounded-full"
            style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--div-neg) 60%, var(--div-mid)), var(--div-mid), color-mix(in srgb, var(--div-pos) 60%, var(--div-mid)))" }}
            aria-hidden
          />
          acima da meta
        </span>
      }
      grafico={
        <div>
          <div className="overflow-x-auto">
            <table className="tabular w-full min-w-[480px] border-separate text-sm" style={{ borderSpacing: 2 }} onMouseLeave={() => setFoco(null)}>
              <thead>
                <tr className="text-xs text-ink-2">
                  <th className="px-2 py-1 text-left font-medium">Categoria</th>
                  {meses.map((m) => (
                    <th key={m} className={`px-2 py-1 text-center font-medium ${m === mesAtual ? "text-ink" : ""}`}>
                      {mesCurto(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat) => (
                  <tr key={cat}>
                    <th scope="row" className="whitespace-nowrap px-2 py-1 text-left text-sm font-medium">
                      {cat}
                    </th>
                    {meses.map((mes) => {
                      const c = celulas.get(`${cat}|${mes}`)!;
                      const ativo = foco?.cat === cat && foco?.mes === mes;
                      return (
                        <td
                          key={mes}
                          tabIndex={0}
                          onMouseEnter={() => setFoco({ cat, mes })}
                          onFocus={() => setFoco({ cat, mes })}
                          className={`rounded-md px-2 py-1.5 text-center ${c.margem < 0 ? "font-semibold" : ""} ${ativo ? "ring-2 ring-[var(--ink)]" : ""}`}
                          style={{ background: fundo(c.delta) }}
                          aria-label={`${cat}, ${nomeMes(mes)}: margem ${pct(c.margem)}, meta ${pct(c.metaMargem)}`}
                        >
                          {pct(c.margem)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 h-5 text-xs text-ink-2" aria-live="polite">
            {foco && atual
              ? `${foco.cat} em ${nomeMes(foco.mes)}: margem ${pct(atual.margem)} · meta ${pct(atual.metaMargem)} · ${pp(atual.delta)} · venda ${reaisCurto(atual.venda)}`
              : "Passe o mouse numa célula para ver meta e diferença."}
          </p>
        </div>
      }
      tabela={
        <TabelaSimples
          chave={(l) => l.cat + l.mes}
          linhas={linhasTabela}
          colunas={[
            { titulo: "Categoria", valor: (l) => l.cat },
            { titulo: "Mês", valor: (l) => mesCurto(l.mes) },
            { titulo: "Margem", alinhar: "dir", valor: (l) => pct(l.c.margem) },
            { titulo: "Meta", alinhar: "dir", valor: (l) => pct(l.c.metaMargem) },
            { titulo: "Diferença", alinhar: "dir", valor: (l) => pp(l.c.delta) },
          ]}
        />
      }
    />
  );
}
