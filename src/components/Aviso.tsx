import { useEffect } from 'react'
import { useQuadro } from '../estado'

const DURACAO_MS = 6000

/** Aviso curto em baixo, com "Desfazer" quando a ação se pode reverter. */
export function Aviso() {
  const aviso = useQuadro((s) => s.aviso)
  const fechar = useQuadro((s) => s.fecharAviso)
  const desfazer = useQuadro((s) => s.desfazer)

  useEffect(() => {
    if (!aviso) return
    const t = window.setTimeout(fechar, DURACAO_MS)
    return () => window.clearTimeout(t)
  }, [aviso, fechar])

  if (!aviso) return null
  return (
    <div className="aviso" role="status" key={aviso.chave}>
      <span>{aviso.texto}</span>
      {aviso.desfazer && (
        <button type="button" onClick={desfazer}>
          Desfazer
        </button>
      )}
    </div>
  )
}
