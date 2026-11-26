import { useState, type ReactNode } from "react";
import { ArrowDownRight, ChartColumn, CircleCheck, Minus, OctagonAlert, Table2, TriangleAlert } from "lucide-react";
import type { Status } from "../lib/calculos";

const STATUS: Record<Status, { rotulo: string; cor: string; Icone: typeof CircleCheck }> = {
  bom: { rotulo: "Na meta", cor: "var(--good)", Icone: CircleCheck },
  atencao: { rotulo: "Atenção", cor: "var(--warning)", Icone: TriangleAlert },
  abaixo: { rotulo: "Abaixo", cor: "var(--serious)", Icone: ArrowDownRight },
  critico: { rotulo: "Crítico", cor: "var(--critical)", Icone: OctagonAlert },
  "sem-meta": { rotulo: "Sem meta", cor: "var(--ink-3)", Icone: Minus },
};

/** status sempre com ícone + texto: a cor nunca carrega o significado sozinha */
export function StatusChip({ status, compacto = false, rotulo: texto }: { status: Status; compacto?: boolean; rotulo?: string }) {
  const { rotulo: padrao, cor, Icone } = STATUS[status];
  const rotulo = texto ?? padrao;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-ink-2">
      <Icone size={compacto ? 14 : 16} strokeWidth={2.4} style={{ color: cor }} aria-hidden />
      {rotulo}
    </span>
  );
}

export type Coluna<T> = { titulo: string; valor: (l: T) => ReactNode; alinhar?: "esq" | "dir" };

export function TabelaSimples<T>({ colunas, linhas, chave }: { colunas: Coluna<T>[]; linhas: T[]; chave: (l: T) => string }) {
  return (
    <div className="max-h-80 overflow-auto rounded-lg">
      <table className="tabular w-full text-sm">
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-line text-left text-xs text-ink-2">
            {colunas.map((c) => (
              <th key={c.titulo} className={`px-2 py-2 font-medium ${c.alinhar === "dir" ? "text-right" : ""}`}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={chave(l)} className="border-b border-line last:border-0">
              {colunas.map((c) => (
                <td key={c.titulo} className={`px-2 py-1.5 ${c.alinhar === "dir" ? "text-right" : ""}`}>
                  {c.valor(l)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** cartão de gráfico com alternância gráfico/tabela (a tabela é a via acessível para todo valor) */
export function CartaoGrafico({
  titulo,
  subtitulo,
  legenda,
  grafico,
  tabela,
  className = "",
}: {
  titulo: string;
  subtitulo?: string;
  legenda?: ReactNode;
  grafico: ReactNode;
  tabela: ReactNode;
  className?: string;
}) {
  const [verTabela, setVerTabela] = useState(false);
  return (
    <section className={`card entrar flex flex-col p-5 ${className}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-xs text-ink-2">{subtitulo}</p>}
        </div>
        <div className="flex rounded-lg bg-surface-2 p-0.5 text-ink-2" role="group" aria-label="Modo de exibição">
          <button
            className={`rounded-md p-1.5 ${!verTabela ? "bg-surface text-ink shadow-sm" : "hover:text-ink"}`}
            onClick={() => setVerTabela(false)}
            aria-pressed={!verTabela}
            title="Ver gráfico"
          >
            <ChartColumn size={16} aria-hidden />
            <span className="sr-only">Ver gráfico</span>
          </button>
          <button
            className={`rounded-md p-1.5 ${verTabela ? "bg-surface text-ink shadow-sm" : "hover:text-ink"}`}
            onClick={() => setVerTabela(true)}
            aria-pressed={verTabela}
            title="Ver tabela"
          >
            <Table2 size={16} aria-hidden />
            <span className="sr-only">Ver tabela</span>
          </button>
        </div>
      </header>
      {!verTabela && legenda && <div className="mb-2 flex flex-wrap gap-4 text-xs text-ink-2">{legenda}</div>}
      <div className="flex min-h-0 flex-1 flex-col [&>*]:flex-1">{verTabela ? tabela : grafico}</div>
    </section>
  );
}

export function ItemLegenda({ tipo, cor, tracejado, children }: { tipo: "linha" | "barra"; cor: string; tracejado?: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {tipo === "linha" ? (
        <svg width="18" height="8" aria-hidden>
          <line x1="1" y1="4" x2="17" y2="4" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeDasharray={tracejado ? "3 3" : undefined} />
        </svg>
      ) : (
        <span className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: cor }} aria-hidden />
      )}
      {children}
    </span>
  );
}

/** linha do tooltip: valor em destaque, nome da série em segundo plano, chave em traço */
export function LinhaTooltip({ cor, nome, valor, tracejado }: { cor: string; nome: string; valor: string; tracejado?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <svg width="12" height="6" aria-hidden>
        <line x1="1" y1="3" x2="11" y2="3" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeDasharray={tracejado ? "2 2" : undefined} />
      </svg>
      <span className="tabular font-semibold text-ink">{valor}</span>
      <span className="text-ink-2">{nome}</span>
    </div>
  );
}

export function CaixaTooltip({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2 text-xs shadow-lg ring-1 ring-[var(--ring)]">
      <div className="mb-1 font-medium text-ink-2">{titulo}</div>
      {children}
    </div>
  );
}
