import { useQuadro } from '../estado'
import { ACOES, NOMES_ACAO, numerosToque, rotuloPasso } from '../jogada'
import type { Acao } from '../jogada'

/** Amostra da linha de cada ação: serve também de legenda. */
function Amostra({ acao }: { acao: Acao }) {
  const estilos: Record<Acao, { cor: string; w: number; dash?: string; d: string }> = {
    servir: { cor: 'var(--servir)', w: 4, dash: '0.1 7', d: 'M4 14 Q 26 10 48 14' },
    passe: { cor: 'var(--passe)', w: 3.5, dash: '9 5', d: 'M4 18 Q 26 4 48 14' },
    levantar: { cor: 'var(--levantar)', w: 2.5, d: 'M4 20 Q 26 -6 48 18' },
    rematar: { cor: 'var(--rematar)', w: 6, d: 'M4 20 L 44 8' },
  }
  const e = estilos[acao]
  return (
    <svg className="amostra" width="56" height="26" viewBox="0 0 56 26" aria-hidden="true">
      <path
        d={e.d}
        fill="none"
        stroke={e.cor}
        strokeWidth={e.w}
        strokeLinecap="round"
        strokeDasharray={e.dash}
      />
      {acao === 'rematar' && <circle cx="48" cy="7" r="5" fill={e.cor} />}
    </svg>
  )
}

export function Passos() {
  const jogada = useQuadro((s) => s.jogada)
  const passoAtual = useQuadro((s) => s.passoAtual)
  const ferramenta = useQuadro((s) => s.ferramenta)
  const setFerramenta = useQuadro((s) => s.setFerramenta)
  const irPasso = useQuadro((s) => s.irPasso)
  const novoPasso = useQuadro((s) => s.novoPasso)
  const apagarPassoAtual = useQuadro((s) => s.apagarPassoAtual)
  const limparJogada = useQuadro((s) => s.limparJogada)

  if (!jogada) return null
  const passos = jogada.passos
  const numeros = numerosToque(passos)

  return (
    <section className="banco passos" aria-labelledby="titulo-jogada">
      <div className="banco-topo">
        <h2 id="titulo-jogada">Jogada</h2>
        <span className="guia">Toca num jogador para lhe levar a bola.</span>
      </div>

      <fieldset className="posicoes acoes-bola">
        <legend>Próximo toque</legend>
        {ACOES.map((a) => (
          <label key={a} className={`radio${ferramenta === a ? ' ativo' : ''}`}>
            <input
              type="radio"
              name="ferramenta"
              id={`ferramenta-${a}`}
              value={a}
              checked={ferramenta === a}
              onChange={() => setFerramenta(a)}
            />
            <Amostra acao={a} />
            {NOMES_ACAO[a]}
          </label>
        ))}
      </fieldset>

      <div className="passos-bloco">
        <div className="rotulo-linha">
          <span className="rotulo">Passos</span>
          <span className="contagem">
            {passoAtual + 1} de {passos.length}
          </span>
        </div>
        <div className="fichas" role="group" aria-label="Passos da jogada">
          {passos.map((p, i) => (
            <button
              key={i}
              type="button"
              className="ficha"
              aria-pressed={i === passoAtual}
              aria-label={`Passo ${i + 1}: ${rotuloPasso(p, i)}`}
              onClick={() => irPasso(i)}
            >
              <span className="n">{i + 1}</span>
              <span className="t">
                {numeros[i] != null ? `${numeros[i]}·` : ''}
                {rotuloPasso(p, i)}
              </span>
            </button>
          ))}
        </div>
        <div className="passos-acoes">
          <button type="button" className="botao" onClick={novoPasso}>
            Novo passo
          </button>
          <button
            type="button"
            className="botao"
            onClick={apagarPassoAtual}
            disabled={passos.length <= 1}
          >
            Apagar passo
          </button>
        </div>
        <span className="nota-passos">
          "Novo passo" copia este passo: arrasta os jogadores para mostrar o movimento.
        </span>
      </div>

      <button type="button" className="texto-erro" onClick={limparJogada}>
        Limpar jogada
      </button>
    </section>
  )
}
