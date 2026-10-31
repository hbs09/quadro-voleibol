import type { Acao } from '../jogada'
import type { Ponto } from '../tipos'

/**
 * Desenho de cada ação da bola, distinto também sem cor:
 * servir = pontilhado · passe = tracejado, curvo · levantar = fino, muito curvo · rematar = grosso, reto, estrela.
 */
const ESTILO: Record<
  Acao,
  { cor: string; largura: number; tracos?: string; curva: number; ponta: 'seta' | 'estrela' }
> = {
  servir: { cor: 'var(--servir)', largura: 9, tracos: '0.1 18', curva: 0.08, ponta: 'seta' },
  passe: { cor: 'var(--passe)', largura: 8, tracos: '26 14', curva: 0.18, ponta: 'seta' },
  levantar: { cor: 'var(--levantar)', largura: 5, curva: 0.42, ponta: 'seta' },
  rematar: { cor: 'var(--rematar)', largura: 15, curva: 0, ponta: 'estrela' },
}

interface Props {
  acao: Acao
  de: Ponto
  para: Ponto
  numero: number | null
  atual: boolean
}

export function Trajeto({ acao, de, para, numero, atual }: Props) {
  const e = ESTILO[acao]
  const dx = para.x - de.x
  const dy = para.y - de.y
  const d = Math.hypot(dx, dy)
  if (d < 1) return null

  // Ponto de controlo da curva, sempre para o mesmo lado da direção.
  const c = { x: (de.x + para.x) / 2 - dy * e.curva, y: (de.y + para.y) / 2 + dx * e.curva }
  // Direção de chegada (tangente no fim da curva).
  const tx = para.x - (e.curva ? c.x : de.x)
  const ty = para.y - (e.curva ? c.y : de.y)
  const tl = Math.hypot(tx, ty) || 1
  const ux = tx / tl
  const uy = ty / tl

  // A linha acaba antes da bola; a seta ou a estrela fica junto dela.
  const recuo = e.ponta === 'seta' ? 34 : 4
  const fim = { x: para.x - ux * recuo, y: para.y - uy * recuo }
  const caminho = e.curva
    ? `M ${de.x} ${de.y} Q ${c.x} ${c.y} ${fim.x} ${fim.y}`
    : `M ${de.x} ${de.y} L ${fim.x} ${fim.y}`

  // Meio da curva, para o número do toque.
  const meio = {
    x: 0.25 * de.x + 0.5 * (e.curva ? c.x : (de.x + para.x) / 2) + 0.25 * para.x,
    y: 0.25 * de.y + 0.5 * (e.curva ? c.y : (de.y + para.y) / 2) + 0.25 * para.y,
  }

  return (
    <g className={`trajeto trajeto-${acao}`} opacity={atual ? 1 : 0.35}>
      <path
        d={caminho}
        fill="none"
        stroke={e.cor}
        strokeWidth={e.largura}
        strokeLinecap="round"
        strokeDasharray={e.tracos}
      />
      {e.ponta === 'seta' ? (
        <polygon
          points={seta(para, ux, uy, acao === 'levantar' ? 30 : 38, acao === 'levantar' ? 13 : 17)}
          fill={e.cor}
        />
      ) : (
        <polygon points={estrela(para, 40, 17, 8)} fill={e.cor} />
      )}
      {numero != null && (
        <g transform={`translate(${meio.x} ${meio.y})`}>
          <circle r={26} fill="var(--fundo)" stroke={e.cor} strokeWidth={5} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--texto)"
            fontFamily="var(--f-titulo)"
            fontWeight={700}
            fontSize={34}
          >
            {numero}
          </text>
        </g>
      )}
    </g>
  )
}

function seta(ponta: Ponto, ux: number, uy: number, comprimento: number, meia: number): string {
  const bx = ponta.x - ux * comprimento
  const by = ponta.y - uy * comprimento
  return [
    `${ponta.x},${ponta.y}`,
    `${bx - uy * meia},${by + ux * meia}`,
    `${bx + uy * meia},${by - ux * meia}`,
  ].join(' ')
}

function estrela(c: Ponto, fora: number, dentro: number, pontas: number): string {
  const pts: string[] = []
  for (let i = 0; i < pontas * 2; i++) {
    const r = i % 2 === 0 ? fora : dentro
    const a = (Math.PI * i) / pontas - Math.PI / 2
    pts.push(`${(c.x + Math.cos(a) * r).toFixed(1)},${(c.y + Math.sin(a) * r).toFixed(1)}`)
  }
  return pts.join(' ')
}
