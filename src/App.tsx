import { useEffect, useMemo, useRef, useState } from "react";
import { Moon, RotateCcw, Sun, Upload, X } from "lucide-react";
import { carregarDemo, identificar, lerMetas, lerVendas, type Base } from "./lib/dados";
import {
  gerarAlertas,
  margemCategoriaMes,
  mesesDisponiveis,
  opcoes,
  porDimensao,
  resumir,
  serieDiaria,
  serieMensal,
  type Filtros,
} from "./lib/calculos";
import { dataLonga, nomeMes } from "./lib/formato";
import { Kpis } from "./components/Kpis";
import { GraficoAcumulado, GraficoMensal } from "./components/Graficos";
import { PainelAlertas, RankingUnidades, TabelaCategorias } from "./components/Paineis";
import { MapaMargem } from "./components/MapaMargem";

const REPO = "https://github.com/LucasCarreiro/dashboard-comercial-varejo";

function temaInicial(): "light" | "dark" {
  const t = document.documentElement.dataset.theme;
  if (t === "dark" || t === "light") return t;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function Seletor({ rotulo, valor, aoMudar, itens, todos }: { rotulo: string; valor: string; aoMudar: (v: string) => void; itens: { v: string; t: string }[]; todos?: string }) {
  return (
    <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-xs font-medium text-ink-2 sm:flex-none">
      {rotulo}
      <select
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        className="h-9 rounded-lg bg-surface px-2.5 text-sm font-normal text-ink ring-1 ring-[var(--ring)] hover:ring-[var(--axis)]"
      >
        {todos && <option value="">{todos}</option>}
        {itens.map((i) => (
          <option key={i.v} value={i.v}>
            {i.t}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  const [base, setBase] = useState<Base | null>(null);
  const [erro, setErro] = useState("");
  const [f, setF] = useState<Filtros>({ mes: "", canal: "", unidade: "", categoria: "" });
  const [tema, setTema] = useState(temaInicial);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarDemo()
      .then(setBase)
      .catch(() => setErro("Não foi possível carregar os dados de demonstração."));
  }, []);

  useEffect(() => {
    if (!base) return;
    const meses = mesesDisponiveis(base);
    setF({ mes: meses[meses.length - 1] ?? "", canal: "", unidade: "", categoria: "" });
  }, [base]);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    try {
      localStorage.setItem("tema", tema);
    } catch {
      /* armazenamento indisponível: o tema vale só nesta visita */
    }
  }, [tema]);

  const dados = useMemo(() => {
    if (!base || !f.mes) return null;
    const r = resumir(base, f);
    const unidades = porDimensao(base, f, "unidade");
    const categorias = porDimensao(base, f, "categoria");
    return {
      r,
      unidades,
      categorias,
      diaria: serieDiaria(base, f, r),
      mensal: serieMensal(base, f),
      mapa: margemCategoriaMes(base, f),
      // os rankings comparam todos; os alertas respeitam todos os filtros
      alertas: gerarAlertas(
        r,
        unidades.filter((u) => !f.unidade || u.nome === f.unidade),
        categorias.filter((c) => !f.categoria || c.nome === f.categoria),
      ),
      op: opcoes(base, f),
      meses: mesesDisponiveis(base),
    };
  }, [base, f]);

  async function importar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro("");
    let vendas: Base["vendas"] | null = null;
    let metas: Base["metas"] = [];
    for (const arq of Array.from(arquivos)) {
      const texto = await arq.text();
      const tipo = identificar(texto);
      if (tipo === "vendas") vendas = lerVendas(texto);
      else if (tipo === "metas") metas = lerMetas(texto);
      else {
        setErro(`"${arq.name}" não tem as colunas esperadas. Veja o formato no README do projeto.`);
        return;
      }
    }
    if (!vendas?.length) {
      setErro("Envie pelo menos um arquivo de vendas (data, canal, unidade, categoria, venda, custo).");
      return;
    }
    setBase({ vendas, metas, origem: "importado" });
  }

  const mudar = (k: keyof Filtros) => (v: string) => setF((o) => ({ ...o, [k]: v, ...(k === "canal" ? { unidade: "" } : {}) }));
  const filtrado = f.canal || f.unidade || f.categoria;

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Compras & Vendas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Painel comercial</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            {dados && (
              <>
                {nomeMes(f.mes)} · movimento até {dataLonga(dados.r.cal.ultimoDia)}
              </>
            )}
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-2 ring-1 ring-[var(--ring)]">
              {base?.origem === "importado" ? "Seus dados (só neste navegador)" : "Dados fictícios"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={entrada} type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => (importar(e.target.files), (e.target.value = ""))} />
          <button
            onClick={() => entrada.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:brightness-110"
            title="Arquivos: vendas.csv (data, canal, unidade, categoria, venda, custo) e, opcional, metas.csv (mes, canal, unidade, categoria, meta_venda, meta_margem)"
          >
            <Upload size={16} aria-hidden /> Importar CSV
          </button>
          {base?.origem === "importado" && (
            <button
              onClick={() => carregarDemo().then(setBase)}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-surface px-3 text-sm ring-1 ring-[var(--ring)] hover:bg-surface-2"
            >
              <RotateCcw size={16} aria-hidden /> Demonstração
            </button>
          )}
          <button
            onClick={() => setTema((t) => (t === "dark" ? "light" : "dark"))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface ring-1 ring-[var(--ring)] hover:bg-surface-2"
            aria-label={tema === "dark" ? "Usar tema claro" : "Usar tema escuro"}
          >
            {tema === "dark" ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
          </button>
        </div>
      </header>

      {erro && (
        <div role="alert" className="card mb-4 flex items-start justify-between gap-3 p-3 text-sm">
          <span>{erro}</span>
          <button onClick={() => setErro("")} aria-label="Fechar aviso" className="text-ink-2 hover:text-ink">
            <X size={16} />
          </button>
        </div>
      )}

      {dados && (
        <>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Seletor rotulo="Mês" valor={f.mes} aoMudar={mudar("mes")} itens={[...dados.meses].reverse().map((m) => ({ v: m, t: nomeMes(m) }))} />
            <Seletor rotulo="Canal" valor={f.canal} aoMudar={mudar("canal")} todos="Todos os canais" itens={dados.op.canais.map((c) => ({ v: c, t: c }))} />
            <Seletor rotulo="Unidade" valor={f.unidade} aoMudar={mudar("unidade")} todos="Todas as unidades" itens={dados.op.unidades.map((u) => ({ v: u, t: u }))} />
            <Seletor rotulo="Categoria" valor={f.categoria} aoMudar={mudar("categoria")} todos="Todas as categorias" itens={dados.op.categorias.map((c) => ({ v: c, t: c }))} />
            {filtrado && (
              <button onClick={() => setF((o) => ({ ...o, canal: "", unidade: "", categoria: "" }))} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-surface hover:text-ink">
                <X size={14} aria-hidden /> Limpar filtros
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Kpis r={dados.r} mes={f.mes} />
            <div className="grid gap-3 lg:grid-cols-3">
              <GraficoAcumulado serie={dados.diaria} mes={f.mes} />
              <PainelAlertas alertas={dados.alertas} />
            </div>
            <div className="grid items-start gap-3 lg:grid-cols-3">
              <TabelaCategorias linhas={dados.categorias} selecionada={f.categoria} aoSelecionar={mudar("categoria")} />
              <RankingUnidades linhas={dados.unidades} selecionada={f.unidade} aoSelecionar={mudar("unidade")} />
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <MapaMargem {...dados.mapa} mesAtual={f.mes} />
              <GraficoMensal serie={dados.mensal} />
            </div>
          </div>
        </>
      )}

      {!dados && !erro && <p className="py-20 text-center text-sm text-ink-2">Carregando dados…</p>}

      <footer className="mt-8 flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-xs text-ink-3">
        <span>Projeto de portfólio de Lucas Carreiro. Todos os números são fictícios, gerados por script.</span>
        <a href={REPO} className="hover:text-ink" target="_blank" rel="noreferrer">
          Código no GitHub
        </a>
      </footer>
    </div>
  );
}
