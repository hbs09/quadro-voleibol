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

/** Nome que cabe na bola: até 7 letras, senão abrevia. */
function nomeCurto(nome: string): string {
  const n = nome.trim()
  return n.length <= 7 ? n : n.slice(0, 6) + '.'
}

interface Arrasto {
  jogadorId: string
  pointerId: number
  /** Diferença entre o ponteiro e o centro da bola, para não "saltar". */
  desvio: Ponto
  marcado: boolean
}

export function Quadro() {
  const svgRef = useRef<SVGSVGElement>(null)
  const arrasto = useRef<Arrasto | null>(null)
  const [aArrastar, setAArrastar] = useState<string | null>(null)

  const plantel = useQuadro((s) => s.plantel)
  const emCampo = useQuadro((s) => s.emCampo)
  const etiqueta = useQuadro((s) => s.etiqueta)
  const mover = useQuadro((s) => s.mover)
  const marcar = useQuadro((s) => s.marcar)

  const porId = new Map<string, Jogador>(plantel.map((j) => [j.id, j]))

  function paraQuadro(e: { clientX: number; clientY: number }): Ponto {
    const svg = svgRef.current!
    const m = svg.getScreenCTM()
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
      desvio: { x: centro.x - p.x, y: centro.y - p.y },
      marcado: false,
    }
    svgRef.current?.setPointerCapture(e.pointerId)
    setAArrastar(jogadorId)
  }

  function movimento(e: RPointerEvent<SVGSVGElement>) {
    const a = arrasto.current
    if (!a || a.pointerId !== e.pointerId) return
    if (!a.marcado) {
      marcar() // só entra no histórico se houver mesmo movimento
      a.marcado = true
    }
    const p = paraQuadro(e)
    mover(a.jogadorId, { x: p.x + a.desvio.x, y: p.y + a.desvio.y })
  }

  function fim(e: RPointerEvent<SVGSVGElement>) {
    const a = arrasto.current
    if (!a || a.pointerId !== e.pointerId) return
    arrasto.current = null
    setAArrastar(null)
  }

  function teclado(e: RKeyboardEvent<SVGGElement>, jogadorId: string, centro: Ponto) {
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
      onPointerUp={fim}
      onPointerCancel={fim}
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
        const j = porId.get(e.jogadorId)
        if (!j) return null
        const texto = etiqueta === 'numero' ? String(j.numero) : nomeCurto(j.nome)
        const tamanho =
          etiqueta === 'numero' ? 60 : Math.max(34, Math.min(46, 200 / Math.max(texto.length, 1)))
        // Nomes compridos encolhem na horizontal para caberem na bola.
        const largo = etiqueta === 'nome' && texto.length >= 5
        const ativo = aArrastar === j.id
        return (
          <g
            key={j.id}
            className={`jogador${ativo ? ' a-arrastar' : ''}`}
            transform={`translate(${e.x} ${e.y})`}
            tabIndex={0}
            aria-label={`${j.nome}, n.º ${j.numero}, ${j.posicao}. Usa as setas para mover.`}
            onPointerDown={(ev) => inicio(ev, j.id, e)}
            onKeyDown={(ev) => teclado(ev, j.id, e)}
          >
            <circle r={RAIO_TOQUE} fill="transparent" />
            {ativo && <circle r={RAIO_BOLA + 12} fill="var(--equipa)" opacity={0.18} />}
            <circle
              className="anel-foco"
              r={RAIO_BOLA + 6}
              fill="none"
              stroke="transparent"
              strokeWidth={4}
            />
            <circle r={RAIO_BOLA} fill="var(--equipa)" />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--equipa-texto)"
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
