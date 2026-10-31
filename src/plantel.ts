import type { EmCampo, Jogador } from './tipos'

/** Zonas da linha de trás. */
export const ZONAS_TRAS = [1, 5, 6]

/** Jogadores que não estão nas 6 posições de campo. */
export function noBanco(plantel: Jogador[], emCampo: EmCampo[]): Jogador[] {
  const ids = new Set(emCampo.map((e) => e.jogadorId))
  return plantel.filter((j) => !ids.has(j.id))
}

export interface TrocaLibero {
  /** Central da linha de trás que sai. */
  centralId: string
  liberoId: string
}

/**
 * Com o líbero ligado, ele toma o lugar do central que está na linha de trás.
 * Devolve null se não houver líbero no banco ou central atrás.
 */
export function trocaLibero(
  plantel: Jogador[],
  emCampo: EmCampo[],
  ativo: boolean,
): TrocaLibero | null {
  if (!ativo) return null
  const porId = new Map(plantel.map((j) => [j.id, j]))
  const libero = noBanco(plantel, emCampo).find((j) => j.posicao === 'L')
  if (!libero) return null
  const central = emCampo.find(
    (e) => ZONAS_TRAS.includes(e.zona) && porId.get(e.jogadorId)?.posicao === 'C',
  )
  if (!central) return null
  return { centralId: central.jogadorId, liberoId: libero.id }
}

export type ResultadoTroca =
  | { ok: true; emCampo: EmCampo[] }
  | { ok: false; motivo: string }

/** Substituição normal: quem entra fica com o lugar e a zona de quem sai. */
export function trocar(
  plantel: Jogador[],
  emCampo: EmCampo[],
  saiId: string,
  entraId: string,
): ResultadoTroca {
  const entra = plantel.find((j) => j.id === entraId)
  if (!entra) return { ok: false, motivo: 'Esse jogador já não está no plantel.' }
  if (emCampo.some((e) => e.jogadorId === entraId)) {
    return { ok: false, motivo: `${entra.nome} já está em campo.` }
  }
  if (entra.posicao === 'L') {
    return { ok: false, motivo: 'O líbero não entra por troca. Liga "Líbero em campo".' }
  }
  if (!emCampo.some((e) => e.jogadorId === saiId)) {
    return { ok: false, motivo: 'Escolhe primeiro um jogador em campo.' }
  }
  return {
    ok: true,
    emCampo: emCampo.map((e) => (e.jogadorId === saiId ? { ...e, jogadorId: entraId } : e)),
  }
}

export type ResultadoValidacao = { ok: true } | { ok: false; campo: 'nome' | 'numero'; motivo: string }

export function validarJogador(
  plantel: Jogador[],
  dados: Omit<Jogador, 'id'>,
  idAtual: string | null,
): ResultadoValidacao {
  if (!dados.nome.trim()) return { ok: false, campo: 'nome', motivo: 'Escreve o nome.' }
  if (!Number.isInteger(dados.numero) || dados.numero < 0 || dados.numero > 99) {
    return { ok: false, campo: 'numero', motivo: 'Usa um número de 0 a 99.' }
  }
  const repetido = plantel.find((j) => j.numero === dados.numero && j.id !== idAtual)
  if (repetido) {
    return { ok: false, campo: 'numero', motivo: `O n.º ${dados.numero} já é do ${repetido.nome}.` }
  }
  return { ok: true }
}

export function novoId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `j${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  }
}
