export type Posicao = 'D' | 'O' | 'P' | 'C' | 'L'

export const NOMES_POSICAO: Record<Posicao, string> = {
  D: 'Distribuidor',
  O: 'Oposto',
  P: 'Ponta',
  C: 'Central',
  L: 'Líbero',
}

export interface Jogador {
  id: string
  nome: string
  numero: number
  posicao: Posicao
}

/** Ponto no quadro, em centímetros (o meio-campo mede 900 × 900). */
export interface Ponto {
  x: number
  y: number
}

/** Jogador em campo: quem é, a zona que ocupa na rotação e onde está desenhado. */
export interface EmCampo extends Ponto {
  jogadorId: string
  zona: number
}
