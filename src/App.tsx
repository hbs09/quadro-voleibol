import { Aviso } from './components/Aviso'
import { Banco } from './components/Banco'
import { FolhaJogador } from './components/FolhaJogador'
import { Quadro } from './components/Quadro'
import { useQuadro } from './estado'

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

  const selecionado = selecao ? plantel.find((j) => j.id === selecao.id) : undefined
  const guia = !selecionado
    ? 'Arrasta para posicionar. Toca para trocar.'
    : selecao?.lado === 'campo'
      ? `${selecionado.nome} sai. Toca em quem entra, no banco.`
      : `${selecionado.nome} entra. Toca em quem sai, no campo.`

  return (
    <div className="app">
      <header className="topo">
        <h1>Quadro</h1>
        <span className="guia" aria-live="polite">
          {guia}
        </span>
        {selecionado && (
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
        <button type="button" className="botao" onClick={repor}>
          Repor
        </button>
      </div>

      <div className="area">
        <main className="quadro-wrap">
          <Quadro />
        </main>
        <Banco />
      </div>

      <FolhaJogador />
      <Aviso />
    </div>
  )
}
