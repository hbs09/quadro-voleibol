import { useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react'
import {
  ADVERSARIO,
  COMPRIMENTO,
  LARGURA,
  LINHA_ATAQUE,
  RAIO_BOLA,
  RAIO_TOQUE,
  ZONA_LIVRE,
} from '../campo'
import { useQuadro } from '../estado'
import { RAIO_BOLA_JOGO, numerosToque, posBola } from '../jogada'
import { trocaLibero } from '../plantel'
import type { Jogador, Ponto } from '../tipos'
import { Trajeto } from './Trajeto'

/** Números das zonas, no canto de cada zona para não ficarem tapados. */
const ETIQUETAS_ZONA = [
  { z: 4, x: 36, y: 262 },
  { z: 3, x: 336, y: 262 },
  { z: 2, x: 636, y: 262 },
  { z: 5, x: 36, y: 862 },
  { z: 6, x: 336, y: 862 },
  { z: 1, x: 636, y: 862 },
]

/** Distância (px de ecrã) a partir da qual um toque passa a ser arrasto. */
const LIMIAR_ARRASTO = 6
/** Movimentos mais curtos do que isto (cm) não se desenham. */
const MOVIMENTO_MINIMO = 25

/** Nome que cabe na bola: até 7 letras, senão abrevia. */
function nomeCurto(nome: string): string {
  const n = nome.trim()
  return n.length <= 7 ? n : n.slice(0, 6) + '.'
}

type Alvo =
  | { tipo: 'jogador'; jogadorId: string; zona: number }
  | { tipo: 'bola' }
  | { tipo: 'fundo' }

interface Arrasto {
  alvo: Alvo
  pointerId: number
  inicioEcra: Ponto
  /** Diferença entre o ponteiro e o centro do objeto, para não "saltar". */
  desvio: Ponto
  aMover: boolean
}

export function Quadro() {
  const svgRef = useRef<SVGSVGElement>(null)
  const arrasto = useRef<Arrasto | null>(null)
  const [aArrastar, setAArrastar] = useState<string | null>(null)

  const plantel = useQuadro((s) => s.plantel)
  const emCampo = useQuadro((s) => s.emCampo)
  const liberoAtivo = useQuadro((s) => s.liberoAtivo)
  const etiqueta = useQuadro((s) => s.etiqueta)
  const selecao = useQuadro((s) => s.selecao)
  const modo = useQuadro((s) => s.modo)
  const jogada = useQuadro((s) => s.jogada)
  const passoAtual = useQuadro((s) => s.passoAtual)
  const mover = useQuadro((s) => s.mover)
  const moverNoPasso = useQuadro((s) => s.moverNoPasso)
  const moverBola = useQuadro((s) => s.moverBola)
  const levarBola = useQuadro((s) => s.levarBola)
  const marcar = useQuadro((s) => s.marcar)
  const tocar = useQuadro((s) => s.tocar)
  const limparSelecao = useQuadro((s) => s.limparSelecao)

  const emJogada = modo === 'jogada' && jogada !== null
  const passos = jogada?.passos ?? []
  const passo = emJogada ? passos[passoAtual] : null
  const anterior = emJogada && passoAtual > 0 ? passos[passoAtual - 1] : null
  const numeros = emJogada ? numerosToque(passos) : []

  const topo = emJogada ? -ADVERSARIO : -64
  const VB = {
    x: -ZONA_LIVRE.lado,
    y: topo,
    w: LARGURA + 2 * ZONA_LIVRE.lado,
    h: COMPRIMENTO + ZONA_LIVRE.fundo - topo,
  }

  const porId = new Map<string, Jogador>(plantel.map((j) => [j.id, j]))
  const libero = trocaLibero(plantel, emCampo, liberoAtivo)

  // Onde cada lugar está desenhado: na formação ou no passo atual da jogada.
  const lugares = emCampo.map((e) => ({ ...e, ...(passo?.posicoes[e.zona] ?? {}) }))
  const bola = passo ? posBola(passo) : null

  function paraQuadro(e: { clientX: number; clientY: number }): Ponto {
    const m = svgRef.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }

  function inicio(e: RPointerEvent<SVGElement>, alvo: Alvo, centro: Ponto) {
    if (arrasto.current) return
    e.preventDefault()
    e.stopPropagation()
    const p = paraQuadro(e)
    arrasto.current = {
      alvo,
      pointerId: e.pointerId,
      inicioEcra: { x: e.clientX, y: e.clientY },
      desvio: { x: centro.x - p.x, y: centro.y - p.y },
      aMover: false,
    }
    svgRef.current?.setPointerCapture(e.pointerId)
    if (alvo.tipo === 'jogador') setAArrastar(alvo.jogadorId)
    if (alvo.tipo === 'bola') setAArrastar('bola')
  }

  function movimento(e: RPointerEvent<SVGSVGElement>) {
    const a = arrasto.current
    if (!a || a.pointerId !== e.pointerId) return
    if (!a.aMover) {
      const d = Math.hypot(e.clientX - a.inicioEcra.x, e.clientY - a.inicioEcra.y)
      if (d < LIMIAR_ARRASTO) return
      a.aMover = true
      if (a.alvo.tipo !== 'fundo') marcar() // só entra no histórico se houver mesmo movimento
    }
    const p = paraQuadro(e)
    const destino = { x: p.x + a.desvio.x, y: p.y + a.desvio.y }
    if (a.alvo.tipo === 'jogador') {
      if (emJogada) moverNoPasso(a.alvo.zona, destino)
      else mover(a.alvo.jogadorId, destino)
    } else if (a.alvo.tipo === 'bola') {
      moverBola(destino)
    }
  }

  function fim(e: RPointerEvent<SVGSVGElement>, cancelado: boolean) {
    const a = arrasto.current
    if (!a || a.pointerId !== e.pointerId) return
    arrasto.current = null
    setAArrastar(null)
    if (a.aMover || cancelado) return
    // Toque sem arrastar.
    if (a.alvo.tipo === 'jogador') {
      if (emJogada) levarBola({ zona: a.alvo.zona })
      else tocar('campo', a.alvo.jogadorId)
    } else if (a.alvo.tipo === 'fundo') {
      if (emJogada) levarBola({ ponto: paraQuadro(e) })
      else limparSelecao()
    }
  }

  function teclado(e: RKeyboardEvent<SVGGElement>, jogadorId: string, zona: number, centro: Ponto) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (emJogada) levarBola({ zona })
      else tocar('campo', jogadorId)
      return
    }
    const passoTecla = e.shiftKey ? 50 : 10
    const d: Record<string, Ponto> = {
      ArrowUp: { x: 0, y: -passoTecla },
      ArrowDown: { x: 0, y: passoTecla },
      ArrowLeft: { x: -passoTecla, y: 0 },
      ArrowRight: { x: passoTecla, y: 0 },
    }
    const v = d[e.key]
    if (!v) return
    e.preventDefault()
    if (!e.repeat) marcar()
    const destino = { x: centro.x + v.x, y: centro.y + v.y }
    if (emJogada) moverNoPasso(zona, destino)
    else mover(jogadorId, destino)
  }

  // Quem está a ser arrastado desenha-se por cima dos outros.
  const ordenados = [...lugares].sort(
    (a, b) => Number(a.jogadorId === aArrastar) - Number(b.jogadorId === aArrastar),
  )

  return (
    <svg
      ref={svgRef}
      className={`quadro${emJogada ? ' em-jogada' : ''}`}
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      preserveAspectRatio="xMidYMin meet"
      onPointerMove={movimento}
      onPointerUp={(e) => fim(e, false)}
      onPointerCancel={(e) => fim(e, true)}
      aria-label={emJogada ? `Quadro da jogada, passo ${passoAtual + 1}` : 'Quadro do campo'}
    >
      {/* Fundo tocável: no modo Jogada, tocar leva a bola até aqui */}
      <rect
        x={VB.x}
        y={VB.y}
        width={VB.w}
        height={VB.h}
        fill="var(--fundo)"
        onPointerDown={(e) => inicio(e, { tipo: 'fundo' }, { x: 0, y: 0 })}
      />

      <g pointerEvents="none">
        {/* Campo adversário (só a parte da frente) */}
        {emJogada && (
          <g>
            <rect
              x={-ZONA_LIVRE.lado}
              y={-ADVERSARIO}
              width={LARGURA + 2 * ZONA_LIVRE.lado}
              height={ADVERSARIO}
              fill="var(--sup2)"
            />
            <rect x={0} y={-ADVERSARIO} width={LARGURA} height={ADVERSARIO} fill="var(--campo-adv)" />
            <g stroke="var(--campo-linha)" strokeWidth={5} opacity={0.55}>
              <line x1={0} y1={-ADVERSARIO} x2={0} y2={0} />
              <line x1={LARGURA} y1={-ADVERSARIO} x2={LARGURA} y2={0} />
              <line x1={0} y1={-LINHA_ATAQUE} x2={LARGURA} y2={-LINHA_ATAQUE} />
            </g>
            <text
              x={LARGURA / 2}
              y={-ADVERSARIO + 44}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--texto2)"
              fontFamily="var(--f-titulo)"
              fontWeight={700}
              fontSize={34}
              letterSpacing={4}
            >
              ADVERSÁRIO
            </text>
          </g>
        )}

        {/* O nosso campo */}
        <rect
          x={-ZONA_LIVRE.lado}
          y={0}
          width={LARGURA + 2 * ZONA_LIVRE.lado}
          height={COMPRIMENTO + ZONA_LIVRE.fundo}
          rx={emJogada ? 0 : 14}
          fill="var(--sup)"
        />
        <rect x={0} y={0} width={LARGURA} height={COMPRIMENTO} fill="var(--campo)" />
        <g stroke="var(--campo-linha)" fill="none" strokeWidth={5}>
          <rect x={0} y={0} width={LARGURA} height={COMPRIMENTO} />
          <line x1={0} y1={LINHA_ATAQUE} x2={LARGURA} y2={LINHA_ATAQUE} />
        </g>
        {/* Prolongamento da linha de ataque, tracejado, na zona livre */}
        <g stroke="var(--campo-linha)" strokeWidth={4} strokeDasharray="14 12" opacity={0.6}>
          <line x1={-ZONA_LIVRE.lado} y1={LINHA_ATAQUE} x2={0} y2={LINHA_ATAQUE} />
          <line x1={LARGURA} y1={LINHA_ATAQUE} x2={LARGURA + ZONA_LIVRE.lado} y2={LINHA_ATAQUE} />
        </g>

        {/* Números das zonas, discretos */}
        <g
          fill="var(--texto2)"
          opacity={0.5}
          fontFamily="var(--f-titulo)"
          fontWeight={700}
          fontSize={44}
          textAnchor="start"
          dominantBaseline="central"
        >
          {ETIQUETAS_ZONA.map((e) => (
            <text key={e.z} x={e.x} y={e.y}>
              {e.z}
            </text>
          ))}
        </g>

        {/* Rede */}
        <rect x={VB.x} y={-7} width={VB.w} height={14} fill="var(--campo-linha)" />
        {!emJogada && (
          <text
            x={LARGURA / 2}
            y={-36}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--texto2)"
            fontFamily="var(--f-titulo)"
            fontWeight={700}
            fontSize={34}
            letterSpacing={4}
          >
            REDE
          </text>
        )}

        {/* Toques da bola até ao passo atual (os antigos ficam mais leves) */}
        {emJogada &&
          passos.slice(1, passoAtual + 1).map((p, k) => {
            const i = k + 1
            if (!p.acao) return null
            return (
              <Trajeto
                key={i}
                acao={p.acao}
                de={posBola(passos[i - 1])}
                para={posBola(p)}
                numero={numeros[i]}
                atual={i === passoAtual}
              />
            )
          })}

        {/* Movimentos dos jogadores neste passo: pontos, com anel na origem */}
        {anterior &&
          passo &&
          lugares.map((e) => {
            const a = anterior.posicoes[e.zona]
            if (!a) return null
            const dx = e.x - a.x
            const dy = e.y - a.y
            const d = Math.hypot(dx, dy)
            if (d < MOVIMENTO_MINIMO) return null
            // Para antes da bola do jogador.
            const f = Math.max(0, (d - RAIO_BOLA - 6) / d)
            return (
              <g key={`mov-${e.zona}`} className="movimento">
                <circle cx={a.x} cy={a.y} r={20} fill="none" stroke="var(--equipa)" strokeWidth={6} />
                <line
                  x1={a.x + (dx / d) * 26}
                  y1={a.y + (dy / d) * 26}
                  x2={a.x + dx * f}
                  y2={a.y + dy * f}
                  stroke="var(--equipa)"
                  strokeWidth={9}
                  strokeLinecap="round"
                  strokeDasharray="0.1 20"
                />
              </g>
            )
          })}
      </g>

      {/* Jogadores */}
      {ordenados.map((e) => {
        // Com líbero ligado, mostra-se o líbero no lugar do central de trás.
        const mostradoId = libero && e.jogadorId === libero.centralId ? libero.liberoId : e.jogadorId
        const j = porId.get(mostradoId)
        if (!j) return null
        const eLibero = j.posicao === 'L'
        const texto = etiqueta === 'numero' ? String(j.numero) : nomeCurto(j.nome)
        const tamanho =
          etiqueta === 'numero' ? 60 : Math.max(34, Math.min(46, 200 / Math.max(texto.length, 1)))
        // Nomes compridos encolhem na horizontal para caberem na bola.
        const largo = etiqueta === 'nome' && texto.length >= 5
        const ativo = aArrastar === e.jogadorId
        const selecionado = !emJogada && selecao?.lado === 'campo' && selecao.id === e.jogadorId
        const dica = emJogada
          ? 'Enter para lhe passar a bola, setas para mover.'
          : 'Enter para selecionar, setas para mover.'
        return (
          <g
            key={e.jogadorId}
            className={`jogador${ativo ? ' a-arrastar' : ''}`}
            transform={`translate(${e.x} ${e.y})`}
            tabIndex={0}
            aria-label={`${j.nome}, n.º ${j.numero}, ${j.posicao}${selecionado ? ', selecionado' : ''}. ${dica}`}
            onPointerDown={(ev) =>
              inicio(ev, { tipo: 'jogador', jogadorId: e.jogadorId, zona: e.zona }, e)
            }
            onKeyDown={(ev) => teclado(ev, e.jogadorId, e.zona, e)}
          >
            <circle r={RAIO_TOQUE} fill="transparent" />
            {ativo && <circle r={RAIO_BOLA + 12} fill="var(--equipa)" opacity={0.18} />}
            {/* Seleção: estado em contorno */}
            {selecionado && (
              <circle
                r={RAIO_BOLA + 13}
                fill="none"
                stroke="var(--texto)"
                strokeWidth={6}
                strokeDasharray="16 10"
              />
            )}
            <circle
              className="anel-foco"
              r={RAIO_BOLA + 6}
              fill="none"
              stroke="transparent"
              strokeWidth={4}
            />
            {/* O líbero distingue-se pela camisola "ao contrário": fundo claro, contorno da equipa */}
            <circle
              r={eLibero ? RAIO_BOLA - 4 : RAIO_BOLA}
              fill={eLibero ? 'var(--fundo)' : 'var(--equipa)'}
              stroke={eLibero ? 'var(--equipa)' : 'none'}
              strokeWidth={eLibero ? 8 : 0}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill={eLibero ? 'var(--equipa)' : 'var(--equipa-texto)'}
              fontFamily="var(--f-titulo)"
              fontWeight={700}
              fontSize={tamanho}
              textLength={largo ? RAIO_BOLA * 1.7 : undefined}
              lengthAdjust="spacingAndGlyphs"
              pointerEvents="none"
            >
              {texto}
            </text>
            {/* Sigla da posição, por baixo da bola */}
            <text
              y={RAIO_BOLA + 28}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--texto)"
              fontFamily="var(--f-titulo)"
              fontWeight={700}
              fontSize={40}
              pointerEvents="none"
            >
              {j.posicao}
            </text>
          </g>
        )
      })}

      {/* Bola (só no modo Jogada); arrasta-se para afinar onde cai */}
      {bola && (
        <g
          className={`bola${aArrastar === 'bola' ? ' a-arrastar' : ''}`}
          transform={`translate(${bola.x} ${bola.y})`}
          aria-label="Bola"
          onPointerDown={(ev) => inicio(ev, { tipo: 'bola' }, bola)}
        >
          <circle r={RAIO_BOLA_JOGO + 22} fill="transparent" />
          <circle r={RAIO_BOLA_JOGO} fill="var(--bola)" stroke="var(--bola-linha)" strokeWidth={5} />
          <g fill="none" stroke="var(--bola-linha)" strokeWidth={3.5} strokeLinecap="round" pointerEvents="none">
            <path d="M -26 -6 Q 0 -18 26 -6" />
            <path d="M -22 14 Q 0 2 22 14" />
            <path d="M -2 -27 Q -14 0 -2 27" />
          </g>
        </g>
      )}
    </svg>
  )
}
