import { beforeEach, describe, expect, test } from 'vitest'
import { ADVERSARIO } from '../campo'
import {
  DESVIO_BOLA,
  inserirMovimento,
  inserirToque,
  limitarBola,
  novaJogada,
  numerosToque,
  posBola,
  proximoToque,
} from '../jogada'
import type { Passo } from '../jogada'
import { PLANTEL_INICIAL, formacaoBase, useQuadro } from '../estado'

const passo = (acao: Passo['acao']): Passo => ({
  posicoes: {},
  bola: { x: 0, y: 0 },
  recebe: null,
  acao,
})

describe('jogada (funções puras)', () => {
  test('numeração dos toques: serviço não conta, recomeça depois de remate', () => {
    const passos = [null, 'servir', 'passe', 'levantar', 'rematar', null, 'passe', 'levantar'].map(
      (a) => passo(a as Passo['acao']),
    )
    expect(numerosToque(passos)).toEqual([null, null, 1, 2, 3, null, 1, 2])
  })

  test('próximo toque', () => {
    const passos = [passo(null), passo('servir'), passo('passe')]
    expect(proximoToque(passos, 2, 'levantar')).toBe(2)
    expect(proximoToque(passos, 1, 'passe')).toBe(1)
    expect(proximoToque(passos, 2, 'servir')).toBeNull()
  })

  test('a bola acompanha o jogador que a recebe', () => {
    let j = novaJogada(formacaoBase())
    j = inserirToque(j, 0, 'servir', { zona: 5 })
    const p = j.passos[1]
    expect(posBola(p)).toEqual({ x: p.posicoes[5].x + DESVIO_BOLA.x, y: p.posicoes[5].y + DESVIO_BOLA.y })
    // Mexer o jogador mexe a bola.
    p.posicoes[5] = { x: 100, y: 500 }
    expect(posBola(p)).toEqual({ x: 100 + DESVIO_BOLA.x, y: 500 + DESVIO_BOLA.y })
  })

  test('inserir no meio não apaga os passos seguintes', () => {
    let j = novaJogada(formacaoBase())
    j = inserirToque(j, 0, 'servir', { zona: 5 })
    j = inserirToque(j, 1, 'passe', { zona: 1 })
    j = inserirMovimento(j, 0)
    expect(j.passos.map((p) => p.acao)).toEqual([null, null, 'servir', 'passe'])
  })

  test('a bola pode ir ao campo adversário, mas não além do que se vê', () => {
    expect(limitarBola({ x: 450, y: -9999 }).y).toBeGreaterThanOrEqual(-ADVERSARIO)
    expect(limitarBola({ x: 450, y: -200 }).y).toBe(-200)
  })
})

describe('estado: editar a jogada', () => {
  beforeEach(() => {
    useQuadro.setState({
      plantel: PLANTEL_INICIAL,
      emCampo: formacaoBase(),
      liberoAtivo: false,
      jogada: null,
      passoAtual: 0,
      ferramenta: 'servir',
      modo: 'formacao',
      historico: [],
      aviso: null,
    })
  })

  test('entrar em Jogada cria a jogada a partir da formação', () => {
    useQuadro.getState().setModo('jogada')
    const s = useQuadro.getState()
    expect(s.jogada?.passos).toHaveLength(1)
    expect(s.jogada?.passos[0].posicoes[1]).toEqual({ x: 750, y: 640 })
  })

  test('serviço → passe → levantar → remate, com a ferramenta a avançar', () => {
    const s = useQuadro.getState()
    s.setModo('jogada')
    useQuadro.getState().levarBola({ zona: 5 })
    expect(useQuadro.getState().ferramenta).toBe('passe')
    useQuadro.getState().levarBola({ zona: 1 })
    useQuadro.getState().levarBola({ zona: 4 })
    expect(useQuadro.getState().ferramenta).toBe('rematar')
    useQuadro.getState().levarBola({ ponto: { x: 200, y: -250 } })
    const f = useQuadro.getState()
    expect(f.jogada?.passos.map((p) => p.acao)).toEqual([null, 'servir', 'passe', 'levantar', 'rematar'])
    expect(f.passoAtual).toBe(4)
    expect(numerosToque(f.jogada!.passos)).toEqual([null, null, 1, 2, 3])
  })

  test('mover no passo não mexe na formação, e Desfazer repõe', () => {
    useQuadro.getState().setModo('jogada')
    useQuadro.getState().novoPasso()
    useQuadro.getState().marcar()
    useQuadro.getState().moverNoPasso(3, { x: 300, y: 120 })
    const s = useQuadro.getState()
    expect(s.jogada?.passos[1].posicoes[3]).toEqual({ x: 300, y: 120 })
    expect(s.jogada?.passos[0].posicoes[3]).toEqual({ x: 450, y: 170 })
    expect(s.emCampo.find((e) => e.zona === 3)).toMatchObject({ x: 450, y: 170 })
    s.desfazer()
    expect(useQuadro.getState().jogada?.passos[1].posicoes[3]).toEqual({ x: 450, y: 170 })
  })

  test('ao voltar a um passo, a ferramenta passa a ser a que vem a seguir a ele', () => {
    useQuadro.getState().setModo('jogada')
    for (const z of [5, 1, 4]) useQuadro.getState().levarBola({ zona: z })
    useQuadro.getState().levarBola({ ponto: { x: 200, y: -250 } })
    useQuadro.getState().irPasso(3)
    expect(useQuadro.getState().ferramenta).toBe('rematar')
    useQuadro.getState().irPasso(0)
    expect(useQuadro.getState().ferramenta).toBe('servir')
  })

  test('apagar passo tem Desfazer; o primeiro passo não se apaga', () => {
    useQuadro.getState().setModo('jogada')
    useQuadro.getState().apagarPassoAtual()
    expect(useQuadro.getState().jogada?.passos).toHaveLength(1)
    useQuadro.getState().levarBola({ zona: 6 })
    useQuadro.getState().apagarPassoAtual()
    expect(useQuadro.getState().jogada?.passos).toHaveLength(1)
    expect(useQuadro.getState().aviso?.desfazer).toBe(true)
    useQuadro.getState().desfazer()
    expect(useQuadro.getState().jogada?.passos).toHaveLength(2)
  })

  test('uma troca no banco não estraga a jogada (ligada à zona, não ao jogador)', () => {
    useQuadro.getState().setModo('jogada')
    useQuadro.getState().levarBola({ zona: 2 })
    useQuadro.getState().setModo('formacao')
    useQuadro.getState().tocar('campo', 'j2')
    useQuadro.getState().tocar('banco', 'j9')
    const s = useQuadro.getState()
    expect(s.emCampo.find((e) => e.zona === 2)?.jogadorId).toBe('j9')
    expect(s.jogada?.passos[1].recebe).toBe(2)
  })
})
