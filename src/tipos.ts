export type Posicao = 'D' | 'O' | 'P' | 'C' | 'L'

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

/** Jogador em campo: quem é e onde está. */
export interface EmCampo extends Ponto {
  jogadorId: string
}
