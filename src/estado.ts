import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StateStorage } from 'zustand/middleware'
import type { EmCampo, Jogador, Ponto } from './tipos'
import { CENTRO_ZONA, limitar } from './campo'
import { noBanco, novoId, trocaLibero, trocar } from './plantel'

/** Plantel de exemplo: 6 em campo (5-1, rotação 1) e 6 no banco. */
export const PLANTEL_INICIAL: Jogador[] = [
  { id: 'j1', nome: 'Rui', numero: 1, posicao: 'D' },
  { id: 'j2', nome: 'Tiago', numero: 7, posicao: 'P' },
  { id: 'j3', nome: 'André', numero: 12, posicao: 'C' },
  { id: 'j4', nome: 'Miguel', numero: 9, posicao: 'O' },
  { id: 'j5', nome: 'Pedro', numero: 4, posicao: 'P' },
  { id: 'j6', nome: 'Nuno', numero: 15, posicao: 'C' },
  { id: 'j7', nome: 'Bruno', numero: 5, posicao: 'L' },
  { id: 'j8', nome: 'Hugo', numero: 3, posicao: 'D' },
  { id: 'j9', nome: 'Diogo', numero: 10, posicao: 'P' },
  { id: 'j10', nome: 'Gonçalo', numero: 11, posicao: 'C' },
  { id: 'j11', nome: 'Ricardo', numero: 8, posicao: 'O' },
  { id: 'j12', nome: 'João', numero: 2, posicao: 'P' },
]

/** Zona de partida de cada titular (rotação 1). */
const ZONAS_INICIAIS: [string, number][] = [
  ['j1', 1],
  ['j2', 2],
  ['j3', 3],
  ['j4', 4],
  ['j5', 5],
  ['j6', 6],
]

export function formacaoBase(): EmCampo[] {
  return ZONAS_INICIAIS.map(([jogadorId, zona]) => ({ jogadorId, zona, ...CENTRO_ZONA[zona] }))
}

/** Volta a pôr cada jogador em campo no centro da sua zona. */
function centrar(emCampo: EmCampo[]): EmCampo[] {
  return emCampo.map((e) => ({ ...e, ...CENTRO_ZONA[e.zona] }))
}

export type Etiqueta = 'numero' | 'nome'
export type Selecao = { lado: 'campo' | 'banco'; id: string } | null

interface Fotografia {
  plantel: Jogador[]
  emCampo: EmCampo[]
  liberoAtivo: boolean
}

export interface Aviso {
  texto: string
  /** Mostrar "Desfazer" no aviso. */
  desfazer: boolean
  chave: number
}

interface EstadoQuadro extends Fotografia {
  etiqueta: Etiqueta
  selecao: Selecao
  /** Jogador a editar: id, 'novo' ou null (folha fechada). */
  editar: string | null
  aviso: Aviso | null
  historico: Fotografia[]

  setEtiqueta: (e: Etiqueta) => void
  marcar: () => void
  mover: (jogadorId: string, p: Ponto) => void
  repor: () => void
  desfazer: () => void

  /** Tocar num jogador (em campo ou no banco): seleciona ou faz a troca. */
  tocar: (lado: 'campo' | 'banco', id: string) => void
  limparSelecao: () => void
  setLibero: (ativo: boolean) => void

  abrirEdicao: (id: string | 'novo') => void
  fecharEdicao: () => void
  guardarJogador: (dados: Omit<Jogador, 'id'>, id: string | null) => void
  removerJogador: (id: string) => void

  avisar: (texto: string, desfazer?: boolean) => void
  fecharAviso: () => void
}

const LIMITE_HISTORICO = 100

/** localStorage que nunca rebenta (janela privada, dados bloqueados…). */
const armazenamentoSeguro: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      /* sem armazenamento: continua só em memória */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* idem */
    }
  },
}

export const useQuadro = create<EstadoQuadro>()(
  persist(
    (set, get) => {
      const fotografia = (): Fotografia => {
        const s = get()
        return { plantel: s.plantel, emCampo: s.emCampo, liberoAtivo: s.liberoAtivo }
      }
      const nome = (id: string) => get().plantel.find((j) => j.id === id)?.nome ?? '?'

      return {
        plantel: PLANTEL_INICIAL,
        emCampo: formacaoBase(),
        liberoAtivo: false,
        etiqueta: 'numero',
        selecao: null,
        editar: null,
        aviso: null,
        historico: [],

        setEtiqueta: (etiqueta) => set({ etiqueta }),

        marcar: () =>
          set((s) => ({ historico: [...s.historico, fotografia()].slice(-LIMITE_HISTORICO) })),

        mover: (jogadorId, p) => {
          const destino = limitar(p)
          set((s) => ({
            emCampo: s.emCampo.map((e) => (e.jogadorId === jogadorId ? { ...e, ...destino } : e)),
          }))
        },

        repor: () => {
          get().marcar()
          set((s) => ({ emCampo: centrar(s.emCampo), selecao: null }))
        },

        desfazer: () =>
          set((s) => {
            if (s.historico.length === 0) return s
            const anterior = s.historico[s.historico.length - 1]
            return { ...anterior, historico: s.historico.slice(0, -1), selecao: null, aviso: null }
          }),

        tocar: (lado, id) => {
          const s = get()
          const sel = s.selecao
          // Mesmo jogador outra vez: tira a seleção.
          if (sel && sel.lado === lado && sel.id === id) return set({ selecao: null })
          // Mesmo lado: muda a seleção.
          if (!sel || sel.lado === lado) return set({ selecao: { lado, id } })

          // Lados diferentes: troca.
          const saiId = lado === 'campo' ? id : sel.id
          const entraId = lado === 'banco' ? id : sel.id
          const libero = trocaLibero(s.plantel, s.emCampo, s.liberoAtivo)
          if (libero && saiId === libero.centralId) {
            return set({
              selecao: null,
              aviso: {
                texto: 'Esse lugar é do líbero. Desliga "Líbero em campo" para trocar.',
                desfazer: false,
                chave: Date.now(),
              },
            })
          }
          const r = trocar(s.plantel, s.emCampo, saiId, entraId)
          if (!r.ok) {
            return set({
              selecao: null,
              aviso: { texto: r.motivo, desfazer: false, chave: Date.now() },
            })
          }
          s.marcar()
          set({
            emCampo: r.emCampo,
            selecao: null,
            aviso: {
              texto: `Entrou ${nome(entraId)}, saiu ${nome(saiId)}.`,
              desfazer: true,
              chave: Date.now(),
            },
          })
        },

        limparSelecao: () => set({ selecao: null }),

        setLibero: (ativo) => {
          const s = get()
          if (ativo) {
            const temLibero = noBanco(s.plantel, s.emCampo).some((j) => j.posicao === 'L')
            if (!temLibero) {
              return set({
                aviso: {
                  texto: 'Não há líbero no plantel. Adiciona um jogador com a posição L.',
                  desfazer: false,
                  chave: Date.now(),
                },
              })
            }
          }
          s.marcar()
          set({ liberoAtivo: ativo, selecao: null })
        },

        abrirEdicao: (id) => set({ editar: id }),
        fecharEdicao: () => set({ editar: null }),

        guardarJogador: (dados, id) => {
          const s = get()
          s.marcar()
          if (id) {
            set({
              plantel: s.plantel.map((j) => (j.id === id ? { ...j, ...dados } : j)),
              editar: null,
              aviso: { texto: `${dados.nome} guardado.`, desfazer: true, chave: Date.now() },
            })
          } else {
            set({
              plantel: [...s.plantel, { id: novoId(), ...dados }],
              editar: null,
              aviso: {
                texto: `${dados.nome} adicionado ao banco.`,
                desfazer: true,
                chave: Date.now(),
              },
            })
          }
        },

        removerJogador: (id) => {
          const s = get()
          if (s.emCampo.some((e) => e.jogadorId === id)) return
          const n = nome(id)
          s.marcar()
          set({
            plantel: s.plantel.filter((j) => j.id !== id),
            editar: null,
            selecao: null,
            aviso: { texto: `${n} removido do plantel.`, desfazer: true, chave: Date.now() },
          })
        },

        avisar: (texto, desfazer = false) =>
          set({ aviso: { texto, desfazer, chave: Date.now() } }),
        fecharAviso: () => set({ aviso: null }),
      }
    },
    {
      name: 'quadro-voleibol',
      version: 2,
      storage: createJSONStorage(() => armazenamentoSeguro),
      partialize: (s) => ({
        plantel: s.plantel,
        emCampo: s.emCampo,
        liberoAtivo: s.liberoAtivo,
        etiqueta: s.etiqueta,
      }),
    },
  ),
)
