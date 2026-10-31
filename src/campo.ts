import type { Ponto } from './tipos'

/**
 * Geometria do meio-campo, em centímetros.
 * A rede está em y = 0 (em cima) e a linha de fundo em y = 900.
 * x = 0 é a lateral esquerda, vista de dentro do campo.
 */
export const LARGURA = 900
export const COMPRIMENTO = 900
export const LINHA_ATAQUE = 300
/** Parte do campo adversário mostrada no modo Jogada (cm a partir da rede). */
export const ADVERSARIO = 450
/** Zona livre à volta do campo que se pode usar no quadro. */
export const ZONA_LIVRE = { lado: 40, fundo: 80 }

export const RAIO_BOLA = 62
/** Área de toque maior que a bola desenhada (≥ 44 px no telemóvel). */
export const RAIO_TOQUE = 74

/** Limites onde o centro de uma bola pode ficar: sem passar a rede. */
export const LIMITES = {
  minX: -ZONA_LIVRE.lado + RAIO_BOLA * 0.5,
  maxX: LARGURA + ZONA_LIVRE.lado - RAIO_BOLA * 0.5,
  minY: RAIO_BOLA + 6,
  maxY: COMPRIMENTO + ZONA_LIVRE.fundo - RAIO_BOLA * 0.5,
}

export function limitar(p: Ponto): Ponto {
  return {
    x: Math.round(Math.min(LIMITES.maxX, Math.max(LIMITES.minX, p.x))),
    y: Math.round(Math.min(LIMITES.maxY, Math.max(LIMITES.minY, p.y))),
  }
}

/** Centro de cada zona (1–6) na formação de base. */
export const CENTRO_ZONA: Record<number, Ponto> = {
  4: { x: 150, y: 170 },
  3: { x: 450, y: 170 },
  2: { x: 750, y: 170 },
  5: { x: 150, y: 640 },
  6: { x: 450, y: 640 },
  1: { x: 750, y: 640 },
}

/**
 * Zona onde está, na rotação r, o jogador cuja zona de partida (rotação 1) é `zona`.
 * Fórmula acordada: z = ((zona-1-(r-1))%6+6)%6+1
 */
export function zonaNaRotacao(zona: number, r: number): number {
  return ((((zona - 1 - (r - 1)) % 6) + 6) % 6) + 1
}
