import { beforeEach, describe, expect, test } from 'vitest'
import { noBanco, trocaLibero, trocar, validarJogador } from '../plantel'
import { PLANTEL_INICIAL, formacaoBase, useQuadro } from '../estado'

const P = PLANTEL_INICIAL
const base = formacaoBase()

describe('plantel', () => {
  test('banco são os que não estão em campo', () => {
    expect(noBanco(P, base).map((j) => j.id)).toEqual(['j7', 'j8', 'j9', 'j10', 'j11', 'j12'])
  })

  test('troca mantém zona e lugar de quem sai', () => {
    const r = trocar(P, base, 'j2', 'j9')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const entrou = r.emCampo.find((e) => e.jogadorId === 'j9')!
    const saiu = base.find((e) => e.jogadorId === 'j2')!
    expect(entrou.zona).toBe(saiu.zona)
    expect([entrou.x, entrou.y]).toEqual([saiu.x, saiu.y])
  })

  test('líbero não entra por troca; quem já está em campo também não', () => {
    expect(trocar(P, base, 'j2', 'j7').ok).toBe(false)
    expect(trocar(P, base, 'j2', 'j3').ok).toBe(false)
  })

  test('líbero fica no lugar do central da linha de trás', () => {
    // Rotação 1: centrais em 3 (frente) e 6 (trás) → sai o da zona 6 (j6).
    expect(trocaLibero(P, base, true)).toEqual({ centralId: 'j6', liberoId: 'j7' })
    expect(trocaLibero(P, base, false)).toBeNull()
    // Sem central atrás, não há troca.
    const semCentralAtras = base.map((e) => (e.jogadorId === 'j6' ? { ...e, zona: 2 } : e))
    expect(trocaLibero(P, semCentralAtras, true)).toBeNull()
  })

  test('validação de nome e número', () => {
    expect(validarJogador(P, { nome: ' ', numero: 20, posicao: 'P' }, null).ok).toBe(false)
    expect(validarJogador(P, { nome: 'Zé', numero: 7, posicao: 'P' }, null).ok).toBe(false)
    expect(validarJogador(P, { nome: 'Tiago', numero: 7, posicao: 'P' }, 'j2').ok).toBe(true)
    expect(validarJogador(P, { nome: 'Zé', numero: 100, posicao: 'P' }, null).ok).toBe(false)
  })
})

describe('estado: tocar para trocar e desfazer', () => {
  beforeEach(() => {
    useQuadro.setState({
      plantel: P,
      emCampo: formacaoBase(),
      liberoAtivo: false,
      selecao: null,
      historico: [],
      aviso: null,
    })
  })

  test('campo → banco troca, e Desfazer repõe', () => {
    const s = useQuadro.getState()
    s.tocar('campo', 'j2')
    expect(useQuadro.getState().selecao).toEqual({ lado: 'campo', id: 'j2' })
    useQuadro.getState().tocar('banco', 'j9')
    const depois = useQuadro.getState()
    expect(depois.emCampo.some((e) => e.jogadorId === 'j9')).toBe(true)
    expect(depois.aviso?.desfazer).toBe(true)
    depois.desfazer()
    expect(useQuadro.getState().emCampo.some((e) => e.jogadorId === 'j2')).toBe(true)
  })

  test('banco → campo também troca', () => {
    useQuadro.getState().tocar('banco', 'j8')
    useQuadro.getState().tocar('campo', 'j1')
    expect(useQuadro.getState().emCampo.find((e) => e.zona === 1)?.jogadorId).toBe('j8')
  })

  test('tocar duas vezes no mesmo tira a seleção', () => {
    useQuadro.getState().tocar('campo', 'j2')
    useQuadro.getState().tocar('campo', 'j2')
    expect(useQuadro.getState().selecao).toBeNull()
  })

  test('não se troca o lugar do líbero', () => {
    useQuadro.getState().setLibero(true)
    useQuadro.getState().tocar('banco', 'j10')
    useQuadro.getState().tocar('campo', 'j6')
    const s = useQuadro.getState()
    expect(s.emCampo.some((e) => e.jogadorId === 'j6')).toBe(true)
    expect(s.aviso?.desfazer).toBe(false)
  })

  test('não se remove quem está em campo; remover do banco tem Desfazer', () => {
    useQuadro.getState().removerJogador('j1')
    expect(useQuadro.getState().plantel).toHaveLength(12)
    useQuadro.getState().removerJogador('j12')
    expect(useQuadro.getState().plantel).toHaveLength(11)
    useQuadro.getState().desfazer()
    expect(useQuadro.getState().plantel).toHaveLength(12)
  })
})
