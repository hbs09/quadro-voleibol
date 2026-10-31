import { useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, KeyboardEvent as RKeyboardEvent } from 'react'
import {
  COMPRIMENTO,
  LARGURA,
  LINHA_ATAQUE,
  RAIO_BOLA,
  RAIO_TOQUE,
  ZONA_LIVRE,
} from '../campo'
import { useQuadro } from '../estado'
import { trocaLibero } from '../plantel'
import type { Jogador, Ponto } from '../tipos'

const VB = {
  x: -ZONA_LIVRE.lado,
  y: -64,
  w: LARGURA + 2 * ZONA_LIVRE.lado,
  h: COMPRIMENTO + ZONA_LIVRE.fundo + 64,
}

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

/** Nome que cabe na bola: até 7 letras, senão abrevia. */
function nomeCurto(nome: string): string {
  const n = nome.trim()
  return n.length <= 7 ? n : n.slice(0, 6) + '.'
}

interface Arrasto {
  /** Jogador da entrada em campo (com líbero, é o central que ele substitui). */
  jogadorId: string
  pointerId: number
  inicioEcra: Ponto
  /** Diferença entre o ponteiro e o centro da bola, para não "saltar". */
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
  const mover = useQuadro((s) => s.mover)
  const marcar = useQuadro((s) => s.marcar)
  const tocar = useQuadro((s) => s.tocar)

  const porId = new Map<string, Jogador>(plantel.map((j) => [j.id, j]))
  const libero = trocaLibero(plantel, emCampo, liberoAtivo)

  function paraQuadro(e: { clientX: number; clientY: number }): Ponto {
    const m = svgRef.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }

  function inicio(e: RPointerEvent<SVGGElement>, jogadorId: string, centro: Ponto) {
    if (arrasto.current) return
    e.preventDefault()
    const p = paraQuadro(e)
    arrasto.current = {
      jogadorId,
      pointerId: e.pointerId,
      inicioEcra: { x: e.clientX, y: e.clientY },
      desvio: { x: centro.x - p.x, y: centro.y - p.y },
      aMover: false,
    }
    svgRef.current?.setPointerCapture(e.pointerId)
    setAArrastar(jogadorId)
  }

  function movimento(e: RPointerEvent<SVGSVGElement>) {
    const a = arrasto.current
    if (!a || a.pointerId !== e.pointerId) return
    if (!a.aMover) {
      const d = Math.hypot(e.clientX - a.inicioEcra.x, e.clientY - a.inicioEcra.y)
      if (d < LIMIAR_ARRASTO) return
      marcar() // só entra no histórico se houver mesmo movimento
      a.aMover = true
    }
    const p = paraQuadro(e)
    mover(a.jogadorId, { x: p.x + a.desvio.x, y: p.y + a.desvio.y })
  }

  function fim(e: RPointerEvent<SVGSVGElement>, cancelado: boolean) {
    const a = arrasto.current
    if (!a || a.pointerId !== e.pointerId) return
    arrasto.current = null
    setAArrastar(null)
    // Toque sem arrastar: seleciona ou troca.
    if (!a.aMover && !cancelado) tocar('campo', a.jogadorId)
  }

  function teclado(e: RKeyboardEvent<SVGGElement>, jogadorId: string, centro: Ponto) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      tocar('campo', jogadorId)
      return
    }
    const passo = e.shiftKey ? 50 : 10
    const d: Record<string, Ponto> = {
      ArrowUp: { x: 0, y: -passo },
      ArrowDown: { x: 0, y: passo },
      ArrowLeft: { x: -passo, y: 0 },
      ArrowRight: { x: passo, y: 0 },
    }
    const v = d[e.key]
    if (!v) return
    e.preventDefault()
    if (!e.repeat) marcar()
    mover(jogadorId, { x: centro.x + v.x, y: centro.y + v.y })
  }

  // Quem está a ser arrastado desenha-se por cima dos outros.
  const ordenados = [...emCampo].sort(
    (a, b) => Number(a.jogadorId === aArrastar) - Number(b.jogadorId === aArrastar),
  )

  return (
    <svg
      ref={svgRef}
      className="quadro"
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      preserveAspectRatio="xMidYMin meet"
      onPointerMove={movimento}
      onPointerUp={(e) => fim(e, false)}
      onPointerCancel={(e) => fim(e, true)}
      aria-label="Quadro do campo"
    >
      {/* Campo */}
      <rect
        x={-ZONA_LIVRE.lado}
        y={0}
        width={LARGURA + 2 * ZONA_LIVRE.lado}
        height={COMPRIMENTO + ZONA_LIVRE.fundo}
        rx={14}
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
        pointerEvents="none"
      >
        {ETIQUETAS_ZONA.map((e) => (
          <text key={e.z} x={e.x} y={e.y}>
            {e.z}
          </text>
        ))}
      </g>

      {/* Rede */}
      <rect x={VB.x} y={-14} width={VB.w} height={14} fill="var(--campo-linha)" />
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
        pointerEvents="none"
      >
        REDE
      </text>

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
        const selecionado = selecao?.lado === 'campo' && selecao.id === e.jogadorId
        return (
          <g
            key={e.jogadorId}
            className={`jogador${ativo ? ' a-arrastar' : ''}`}
            transform={`translate(${e.x} ${e.y})`}
            tabIndex={0}
            aria-label={`${j.nome}, n.º ${j.numero}, ${j.posicao}${selecionado ? ', selecionado' : ''}. Enter para selecionar, setas para mover.`}
            onPointerDown={(ev) => inicio(ev, e.jogadorId, e)}
            onKeyDown={(ev) => teclado(ev, e.jogadorId, e)}
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
    </svg>
  )
}
