import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuadro } from '../estado'
import { validarJogador } from '../plantel'
import { NOMES_POSICAO } from '../tipos'
import type { Posicao } from '../tipos'

const POSICOES: Posicao[] = ['D', 'O', 'P', 'C', 'L']

/** Folha inferior para adicionar ou editar um jogador. */
export function FolhaJogador() {
  const editar = useQuadro((s) => s.editar)
  if (!editar) return null
  // A key força estado novo sempre que se abre outro jogador.
  return <Folha key={editar} id={editar === 'novo' ? null : editar} />
}

function Folha({ id }: { id: string | null }) {
  const plantel = useQuadro((s) => s.plantel)
  const emCampo = useQuadro((s) => s.emCampo)
  const fechar = useQuadro((s) => s.fecharEdicao)
  const guardar = useQuadro((s) => s.guardarJogador)
  const remover = useQuadro((s) => s.removerJogador)

  const atual = id ? plantel.find((j) => j.id === id) : undefined
  const livre = (() => {
    const usados = new Set(plantel.map((j) => j.numero))
    for (let n = 1; n <= 99; n++) if (!usados.has(n)) return n
    return 0
  })()

  const [nome, setNome] = useState(atual?.nome ?? '')
  const [numero, setNumero] = useState(String(atual?.numero ?? livre))
  const [posicao, setPosicao] = useState<Posicao>(atual?.posicao ?? 'P')
  const [erro, setErro] = useState<{ campo: 'nome' | 'numero'; motivo: string } | null>(null)
  const primeiro = useRef<HTMLInputElement>(null)

  const emJogo = id ? emCampo.some((e) => e.jogadorId === id) : false

  useEffect(() => {
    primeiro.current?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [fechar])

  function submeter(e: FormEvent) {
    e.preventDefault()
    const dados = { nome: nome.trim(), numero: Number(numero), posicao }
    const v = validarJogador(plantel, dados, id)
    if (!v.ok) {
      setErro({ campo: v.campo, motivo: v.motivo })
      return
    }
    guardar(dados, id)
  }

  return (
    <div className="folha-fundo" onPointerDown={(e) => e.target === e.currentTarget && fechar()}>
      <form
        className="folha"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-folha"
        onSubmit={submeter}
        noValidate
      >
        <span className="pega" aria-hidden="true" />
        <h2 id="titulo-folha">{atual ? `Editar ${atual.nome}` : 'Novo jogador'}</h2>

        <div className="campos-linha">
          <label className="campo-form crescer">
            <span>Nome</span>
            <input
              ref={primeiro}
              id="jogador-nome"
              value={nome}
              maxLength={20}
              autoComplete="off"
              aria-invalid={erro?.campo === 'nome'}
              onChange={(e) => {
                setNome(e.target.value)
                setErro(null)
              }}
            />
          </label>
          <label className="campo-form numero">
            <span>N.º</span>
            <input
              id="jogador-numero"
              value={numero}
              inputMode="numeric"
              maxLength={2}
              aria-invalid={erro?.campo === 'numero'}
              onChange={(e) => {
                setNumero(e.target.value.replace(/\D/g, ''))
                setErro(null)
              }}
            />
          </label>
        </div>
        {erro && (
          <p className="erro" role="alert">
            {erro.motivo}
          </p>
        )}

        <fieldset className="posicoes">
          <legend>Posição</legend>
          {POSICOES.map((p) => (
            <label key={p} className={`radio${posicao === p ? ' ativo' : ''}`}>
              <input
                type="radio"
                name="posicao"
                id={`posicao-${p}`}
                value={p}
                checked={posicao === p}
                onChange={() => setPosicao(p)}
              />
              <span className="sigla">{p}</span>
              {NOMES_POSICAO[p]}
            </label>
          ))}
        </fieldset>

        {atual && (
          <div className="remover">
            {emJogo ? (
              <span className="nota">Para remover, tira-o primeiro de campo.</span>
            ) : (
              <button type="button" className="texto-erro" onClick={() => remover(atual.id)}>
                Remover do plantel
              </button>
            )}
          </div>
        )}

        <div className="acoes">
          <button type="button" className="botao" onClick={fechar}>
            Cancelar
          </button>
          <button type="submit" className="botao cheio">
            {atual ? 'Guardar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  )
}
