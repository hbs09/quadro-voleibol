import { create } from 'zustand'
import type { EmCampo, Jogador, Ponto } from './tipos'
import { CENTRO_ZONA, limitar } from './campo'

/** Plantel inicial de exemplo (5-1, rotação 1: distribuidor na zona 1). */
export const PLANTEL_INICIAL: Jogador[] = [
  { id: 'j1', nome: 'Rui', numero: 1, posicao: 'D' },
  { id: 'j2', nome: 'Tiago', numero: 7, posicao: 'P' },
  { id: 'j3', nome: 'André', numero: 12, posicao: 'C' },
  { id: 'j4', nome: 'Miguel', numero: 9, posicao: 'O' },
  { id: 'j5', nome: 'Pedro', numero: 4, posicao: 'P' },
  { id: 'j6', nome: 'Nuno', numero: 15, posicao: 'C' },
]

/** Zona de partida de cada jogador em campo (índice = zona). */
const ZONAS_INICIAIS: Record<string, number> = {
  j1: 1,
  j2: 2,
  j3: 3,
  j4: 4,
  j5: 5,
  j6: 6,
}

export function formacaoBase(): EmCampo[] {
  return Object.entries(ZONAS_INICIAIS).map(([jogadorId, zona]) => ({
    jogadorId,
    ...CENTRO_ZONA[zona],
  }))
}

export type Etiqueta = 'numero' | 'nome'

interface EstadoQuadro {
  plantel: Jogador[]
  emCampo: EmCampo[]
  etiqueta: Etiqueta
  historico: EmCampo[][]
  setEtiqueta: (e: Etiqueta) => void
  /** Guarda o estado atual no histórico (chamar ao começar um arrasto). */
  marcar: () => void
  mover: (jogadorId: string, p: Ponto) => void
  repor: () => void
  desfazer: () => void
}

const LIMITE_HISTORICO = 100

export const useQuadro = create<EstadoQuadro>((set, get) => ({
  plantel: PLANTEL_INICIAL,
  emCampo: formacaoBase(),
  etiqueta: 'numero',
  historico: [],

  setEtiqueta: (etiqueta) => set({ etiqueta }),

  marcar: () =>
    set((s) => ({
      historico: [...s.historico, s.emCampo].slice(-LIMITE_HISTORICO),
    })),

  mover: (jogadorId, p) => {
    const destino = limitar(p)
    set((s) => ({
      emCampo: s.emCampo.map((e) =>
        e.jogadorId === jogadorId ? { ...e, ...destino } : e,
      ),
    }))
  },

  repor: () => {
    get().marcar()
    set({ emCampo: formacaoBase() })
  },

  desfazer: () =>
    set((s) => {
      if (s.historico.length === 0) return s
      const anterior = s.historico[s.historico.length - 1]
      return { emCampo: anterior, historico: s.historico.slice(0, -1) }
    }),
}))
