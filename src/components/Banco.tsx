import { useQuadro } from '../estado'
import { noBanco, trocaLibero } from '../plantel'
import type { Jogador } from '../tipos'

/** Ordem das posições na lista do banco. */
const ORDEM = { D: 0, O: 1, P: 2, C: 3, L: 4 } as const

export function Banco() {
  const plantel = useQuadro((s) => s.plantel)
  const emCampo = useQuadro((s) => s.emCampo)
  const liberoAtivo = useQuadro((s) => s.liberoAtivo)
  const selecao = useQuadro((s) => s.selecao)
  const tocar = useQuadro((s) => s.tocar)
  const setLibero = useQuadro((s) => s.setLibero)
  const abrirEdicao = useQuadro((s) => s.abrirEdicao)

  const libero = trocaLibero(plantel, emCampo, liberoAtivo)
  const porId = new Map(plantel.map((j) => [j.id, j]))

  // No banco: quem não está em campo, menos o líbero quando está a jogar.
  // O central que deu o lugar ao líbero aparece no banco, marcado.
  const banco = noBanco(plantel, emCampo)
    .filter((j) => j.id !== libero?.liberoId)
    .sort((a, b) => ORDEM[a.posicao] - ORDEM[b.posicao] || a.numero - b.numero)
  const centralFora = libero ? porId.get(libero.centralId) : undefined

  const aTrocar = selecao?.lado === 'campo'
  const temLibero = plantel.some((j) => j.posicao === 'L')

  return (
    <section className="banco" aria-labelledby="titulo-banco">
      <div className="banco-topo">
        <h2 id="titulo-banco">Banco</h2>
        <span className="guia">
          {aTrocar ? 'Toca em quem entra.' : 'Toca num jogador e depois em quem sai.'}
        </span>
      </div>

      {temLibero && (
        <button
          type="button"
          className={`estado-toggle${liberoAtivo ? ' ligado' : ''}`}
          aria-pressed={liberoAtivo}
          onClick={() => setLibero(!liberoAtivo)}
        >
          <span className="caixa" aria-hidden="true">
            {liberoAtivo ? '✓' : ''}
          </span>
          Líbero em campo
          <span className="nota">no lugar do central de trás</span>
        </button>
      )}

      <ul className="lista">
        {centralFora && (
          <li className="linha fora">
            <Mini jogador={centralFora} />
            <span className="nome">
              {centralFora.nome}
              <span className="sub">Fora pelo líbero</span>
            </span>
          </li>
        )}
        {banco.map((j) => {
          const sel = selecao?.lado === 'banco' && selecao.id === j.id
          return (
            <li key={j.id} className={`linha${sel ? ' selecionado' : ''}`}>
              <button
                type="button"
                className="linha-principal"
                aria-pressed={sel}
                onClick={() => tocar('banco', j.id)}
              >
                <Mini jogador={j} />
                <span className="nome">
                  {j.nome}
                  {sel && <span className="sub">✓ Selecionado</span>}
                </span>
                <span className="sigla">{j.posicao}</span>
              </button>
              <button
                type="button"
                className="editar"
                aria-label={`Editar ${j.nome}`}
                onClick={() => abrirEdicao(j.id)}
              >
                <IconeLapis />
              </button>
            </li>
          )
        })}
        {banco.length === 0 && !centralFora && (
          <li className="vazio">O banco está vazio. Adiciona jogadores ao plantel.</li>
        )}
      </ul>

      <button type="button" className="botao largo" onClick={() => abrirEdicao('novo')}>
        Adicionar jogador
      </button>
    </section>
  )
}

function Mini({ jogador }: { jogador: Jogador }) {
  const eLibero = jogador.posicao === 'L'
  return (
    <span className={`mini${eLibero ? ' libero' : ''}`} aria-hidden="true">
      {jogador.numero}
    </span>
  )
}

function IconeLapis() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L19 9l-4-4L4 16v4z M13.5 6.5l4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
