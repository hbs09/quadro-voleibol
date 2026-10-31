import type { EmCampo, Ponto } from './tipos'
import { ADVERSARIO, COMPRIMENTO, LARGURA, ZONA_LIVRE } from './campo'

export type Acao = 'servir' | 'passe' | 'levantar' | 'rematar'

export const ACOES: Acao[] = ['servir', 'passe', 'levantar', 'rematar']

export const NOMES_ACAO: Record<Acao, string> = {
  servir: 'Servir',
  passe: 'Passe',
  levantar: 'Levantar',
  rematar: 'Rematar',
}

/** A ferramenta avança sozinha depois de cada toque. */
export const SEGUINTE: Record<Acao, Acao> = {
  servir: 'passe',
  passe: 'levantar',
  levantar: 'rematar',
  rematar: 'passe',
}

export interface Passo {
  /** Posição de cada lugar em campo, pela zona (1–6). Assim, trocas não estragam a jogada. */
  posicoes: Record<number, Ponto>
  /** Onde está a bola, quando não está com um jogador. */
  bola: Ponto
  /** Zona do jogador que tem a bola neste passo (a bola acompanha-o). */
  recebe: number | null
  /** Como a bola chegou aqui desde o passo anterior. null = só movimento. */
  acao: Acao | null
}

export interface Jogada {
  passos: Passo[]
}

/** A bola desenha-se ao lado do jogador, para não tapar o número. */
export const DESVIO_BOLA: Ponto = { x: 50, y: -50 }
export const RAIO_BOLA_JOGO = 28

const LIMITES_BOLA = {
  minX: -ZONA_LIVRE.lado + RAIO_BOLA_JOGO,
  maxX: LARGURA + ZONA_LIVRE.lado - RAIO_BOLA_JOGO,
  minY: -ADVERSARIO + RAIO_BOLA_JOGO,
  maxY: COMPRIMENTO + ZONA_LIVRE.fundo - RAIO_BOLA_JOGO,
}

export function limitarBola(p: Ponto): Ponto {
  return {
    x: Math.round(Math.min(LIMITES_BOLA.maxX, Math.max(LIMITES_BOLA.minX, p.x))),
    y: Math.round(Math.min(LIMITES_BOLA.maxY, Math.max(LIMITES_BOLA.minY, p.y))),
  }
}

export function posBola(p: Passo): Ponto {
  if (p.recebe != null && p.posicoes[p.recebe]) {
    const j = p.posicoes[p.recebe]
    return { x: j.x + DESVIO_BOLA.x, y: j.y + DESVIO_BOLA.y }
  }
  return p.bola
}

/** Jogada nova a partir da formação atual: a bola começa do lado do adversário. */
export function novaJogada(emCampo: EmCampo[]): Jogada {
  const posicoes: Record<number, Ponto> = {}
  for (const e of emCampo) posicoes[e.zona] = { x: e.x, y: e.y }
  return {
    passos: [{ posicoes, bola: { x: LARGURA / 2, y: -ADVERSARIO + 80 }, recebe: null, acao: null }],
  }
}

/**
 * Número do toque em cada passo (1, 2, 3). O serviço não conta;
 * a contagem recomeça depois de um serviço ou de um remate.
 */
export function numerosToque(passos: Passo[]): (number | null)[] {
  let c = 0
  return passos.map((p) => {
    if (!p.acao) return null
    if (p.acao === 'servir') {
      c = 0
      return null
    }
    c += 1
    const n = c
    if (p.acao === 'rematar') c = 0
    return n
  })
}

/** Número que o próximo toque terá, se for inserido a seguir ao passo `atual`. */
export function proximoToque(passos: Passo[], atual: number, ferramenta: Acao): number | null {
  if (ferramenta === 'servir') return null
  const ate = passos.slice(0, atual + 1)
  let c = 0
  for (const p of ate) {
    if (!p.acao) continue
    if (p.acao === 'servir' || p.acao === 'rematar') c = 0
    else c += 1
  }
  return c + 1
}

export type Destino = { zona: number } | { ponto: Ponto }

/** Insere um toque a seguir ao passo `atual`. Os jogadores ficam onde estavam. */
export function inserirToque(j: Jogada, atual: number, acao: Acao, destino: Destino): Jogada {
  const base = j.passos[atual]
  const novo: Passo = {
    posicoes: { ...base.posicoes },
    bola: 'zona' in destino ? posBola(base) : limitarBola(destino.ponto),
    recebe: 'zona' in destino ? destino.zona : null,
    acao,
  }
  const passos = [...j.passos]
  passos.splice(atual + 1, 0, novo)
  return { passos }
}

/** Passo só de movimento: copia o atual, a bola fica onde está. */
export function inserirMovimento(j: Jogada, atual: number): Jogada {
  const base = j.passos[atual]
  const novo: Passo = { posicoes: { ...base.posicoes }, bola: posBola(base), recebe: base.recebe, acao: null }
  const passos = [...j.passos]
  passos.splice(atual + 1, 0, novo)
  return { passos }
}

export function apagarPasso(j: Jogada, i: number): Jogada {
  if (j.passos.length <= 1) return j
  return { passos: j.passos.filter((_, k) => k !== i) }
}

export function alterarPasso(j: Jogada, i: number, f: (p: Passo) => Passo): Jogada {
  return { passos: j.passos.map((p, k) => (k === i ? f(p) : p)) }
}

/** Ferramenta que faz sentido a seguir ao passo i (a seguir à última ação até lá). */
export function ferramentaDepois(passos: Passo[], i: number): Acao {
  for (let k = i; k >= 0; k--) {
    const a = passos[k]?.acao
    if (a) return SEGUINTE[a]
  }
  return 'servir'
}

/** Nome curto do passo para a lista de passos. */
export function rotuloPasso(p: Passo, i: number): string {
  if (i === 0) return 'Início'
  if (!p.acao) return 'Mover'
  return NOMES_ACAO[p.acao]
}
