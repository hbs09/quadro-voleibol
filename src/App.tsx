import { Quadro } from './components/Quadro'
import { useQuadro } from './estado'

export default function App() {
  const etiqueta = useQuadro((s) => s.etiqueta)
  const setEtiqueta = useQuadro((s) => s.setEtiqueta)
  const podeDesfazer = useQuadro((s) => s.historico.length > 0)
  const desfazer = useQuadro((s) => s.desfazer)
  const repor = useQuadro((s) => s.repor)

  return (
    <div className="app">
      <header className="topo">
        <h1>Quadro</h1>
        <span className="guia">Arrasta os jogadores para os posicionar.</span>
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

      <main className="quadro-wrap">
        <Quadro />
      </main>
    </div>
  )
}
