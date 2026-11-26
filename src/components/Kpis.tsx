import type { Resumo } from "../lib/calculos";
import { statusTendencia } from "../lib/calculos";
import { dataCurta, mesCurto, pct, pp, reais, reaisCurto, variacao } from "../lib/formato";
import { mesAnterior } from "../lib/calculos";
import { StatusChip } from "./ui";

function Delta({ valor, texto, formatar = variacao }: { valor: number; texto: string; formatar?: (v: number) => string }) {
  if (!Number.isFinite(valor)) return <span className="text-ink-3">{texto}</span>;
  const cor = valor > 0 ? "text-good-ink" : valor < 0 ? "text-critical-ink" : "text-ink-2";
  return (
    <span>
      <span className={`font-semibold ${cor}`}>{formatar(valor)}</span> <span className="text-ink-2">{texto}</span>
    </span>
  );
}

function Bloco({ rotulo, valor, children }: { rotulo: string; valor: string; children?: React.ReactNode }) {
  return (
    <div className="card entrar flex flex-col gap-1 p-4">
      <span className="text-xs font-medium text-ink-2">{rotulo}</span>
      <span className="text-2xl font-semibold tracking-tight">{valor}</span>
      <div className="mt-auto flex flex-col gap-1 pt-1 text-xs">{children}</div>
    </div>
  );
}

export function Kpis({ r, mes }: { r: Resumo; mes: string }) {
  const esperado = (r.cal.decorridos / r.cal.total) * 100; // onde deveria estar hoje, se o ritmo fosse linear
  const status = statusTendencia(r.tendenciaPct);
  const ating = Math.min(r.atingimento || 0, 100);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <div className="card entrar col-span-2 flex flex-col gap-2 p-5">
        <span className="text-xs font-medium text-ink-2">Venda no mês</span>
        <span className="text-5xl font-semibold tracking-tight" title={reais(r.venda)}>
          {reaisCurto(r.venda)}
        </span>
        <div className="text-sm text-ink-2">
          <span className="font-semibold text-ink">{pct(r.atingimento)}</span> da meta de {reaisCurto(r.meta)}
        </div>
        {/* medidor: preenchimento = realizado; traço = onde deveria estar pelo calendário */}
        <div className="relative mt-1 h-2 rounded-full bg-accent-soft" role="img" aria-label={`Realizado ${pct(r.atingimento)} da meta; esperado para hoje ${pct(esperado)}`}>
          <div className="h-2 rounded-full bg-accent transition-[width] duration-500" style={{ width: `${ating}%` }} />
          {!r.cal.fechado && (
            <div className="absolute -top-1 h-4 w-0.5 rounded bg-ink" style={{ left: `calc(${esperado}% - 1px)` }} />
          )}
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-xs">
          <Delta valor={r.variacaoAnterior} texto={`vs. mesmo período de ${mesCurto(mesAnterior(mes))}`} />
          {!r.cal.fechado && <span className="text-ink-2">traço = esperado para hoje ({pct(esperado, 0)})</span>}
        </div>
      </div>

      <Bloco rotulo={r.cal.fechado ? "Fechamento do mês" : "Tendência de fechamento"} valor={reaisCurto(r.tendencia)}>
        <span className="text-ink-2">
          <span className="font-semibold text-ink">{pct(r.tendenciaPct)}</span> da meta
        </span>
        <StatusChip status={status} />
      </Bloco>

      <Bloco rotulo="Margem bruta" valor={pct(r.margem)}>
        <span className="text-ink-2">meta {pct(r.metaMargem)}</span>
        <Delta valor={r.margem - r.metaMargem} texto="vs. meta" formatar={pp} />
      </Bloco>

      <Bloco rotulo={`Último dia (${dataCurta(r.cal.ultimoDia)})`} valor={reaisCurto(r.ultimoDiaVenda)}>
        <span className="text-ink-2">meta diária {reaisCurto(r.metaDiaria)}</span>
        <Delta valor={r.metaDiaria > 0 ? (r.ultimoDiaVenda / r.metaDiaria - 1) * 100 : NaN} texto="vs. meta diária" />
      </Bloco>

      <Bloco rotulo="Dias úteis" valor={`${r.cal.decorridos} de ${r.cal.total}`}>
        {r.cal.fechado ? (
          <span className="text-ink-2">mês fechado</span>
        ) : (
          <>
            <span className="text-ink-2">{r.cal.restantes} restantes</span>
            <span className="text-ink-2">
              precisa de <span className="font-semibold text-ink">{reaisCurto(r.necessarioDia)}</span>/dia
            </span>
          </>
        )}
      </Bloco>
    </div>
  );
}
