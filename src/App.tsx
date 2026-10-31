import { Aviso } from './components/Aviso'
import { Banco } from './components/Banco'
import { FolhaJogador } from './components/FolhaJogador'
import { Passos } from './components/Passos'
import { Quadro } from './components/Quadro'
import { useQuadro } from './estado'
import { NOMES_ACAO, proximoToque } from './jogada'
import type { Acao } from './jogada'

/** Frase do guia para cada ferramenta. */
const FRASE: Record<Acao, string> = {
  servir: 'Toca em quem recebe o serviço.',
  passe: 'Toca em quem recebe o passe.',
  levantar: 'Toca em quem vai rematar.',
  rematar: 'Toca onde cai o remate.',
}

export default function App() {
  const etiqueta = useQuadro((s) => s.etiqueta)
  const setEtiqueta = useQuadro((s) => s.setEtiqueta)
  const podeDesfazer = useQuadro((s) => s.historico.length > 0)
  const desfazer = useQuadro((s) => s.desfazer)
  const repor = useQuadro((s) => s.repor)
  const selecao = useQuadro((s) => s.selecao)
  const plantel = useQuadro((s) => s.plantel)
  const limparSelecao = useQuadro((s) => s.limparSelecao)
  const abrirEdicao = useQuadro((s) => s.abrirEdicao)
  const modo = useQuadro((s) => s.modo)
  const setModo = useQuadro((s) => s.setModo)
  const jogada = useQuadro((s) => s.jogada)
  const passoAtual = useQuadro((s) => s.passoAtual)
  const ferramenta = useQuadro((s) => s.ferramenta)

  const emJogada = modo === 'jogada'
  const selecionado = selecao ? plantel.find((j) => j.id === selecao.id) : undefined

  let marcador: string | null = null
  let guia: string
  if (emJogada && jogada) {
    const n = proximoToque(jogada.passos, passoAtual, ferramenta)
    marcador = `${n != null ? `Toque ${n} · ` : ''}${NOMES_ACAO[ferramenta]}`
    guia = FRASE[ferramenta]
  } else if (!selecionado) {
    guia = 'Arrasta para posicionar. Toca para trocar.'
  } else if (selecao?.lado === 'campo') {
    guia = `${selecionado.nome} sai. Toca em quem entra, no banco.`
  } else {
    guia = `${selecionado.nome} entra. Toca em quem sai, no campo.`
  }

  return (
    <div className="app">
      <header className="topo">
        <h1>Quadro</h1>
        <span className="guia" aria-live="polite">
          {marcador && <strong className="marcador">{marcador}</strong>}
          {guia}
        </span>
        {!emJogada && selecionado && (
          <span className="topo-acoes">
            {selecao?.lado === 'campo' && (
              <button type="button" className="botao" onClick={() => abrirEdicao(selecionado.id)}>
                Editar
              </button>
            )}
            <button type="button" className="botao" onClick={limparSelecao}>
              Cancelar
            </button>
          </span>
        )}
      </header>

      <div className="ferramentas">
        <div className="segmentado" role="group" aria-label="Modo">
          <button type="button" aria-pressed={!emJogada} onClick={() => setModo('formacao')}>
            Formação
          </button>
          <button type="button" aria-pressed={emJogada} onClick={() => setModo('jogada')}>
            Jogada
          </button>
        </div>
        <div className="segmentado" role="group" aria-label="Mostrar nas bolas">
          <button
            type="button"
            aria-pressed={etiqueta === 'numero'}
            onClick={() => setEtiqueta('numero')}
          >
            N.º
          </button>
          <button
            type="button"
            aria-pressed={etiqueta === 'nome'}
            onClick={() => setEtiqueta('nome')}
          >
            Nome
          </button>
        </div>
        <span className="espaco" />
        <button type="button" className="botao" onClick={desfazer} disabled={!podeDesfazer}>
          Desfazer
        </button>
        {!emJogada && (
          <button type="button" className="botao" onClick={repor}>
            Repor
          </button>
        )}
      </div>

      <div className="area">
        <main className="quadro-wrap">
          <Quadro />
        </main>
        {emJogada ? <Passos /> : <Banco />}
      </div>

      <FolhaJogador />
      <Aviso />
    </div>
  )
}
