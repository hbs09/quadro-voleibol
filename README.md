# Quadro de táticas de voleibol

Site para montar táticas de voleibol: quadro do campo, jogadores arrastáveis, jogadas com movimento, banco e jogadas guardadas.

## Correr no computador

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm test         # testes da lógica (rotação, limites, desfazer)
npm run build    # gera a pasta dist/
```

## Publicar na Vercel

1. Põe esta pasta num repositório do GitHub.
2. Na Vercel: Add New → Project → escolhe o repositório.
3. A Vercel deteta o Vite sozinha (build `npm run build`, saída `dist`). Deploy.

## Estado

- [x] Fase 0 – Projeto, cores e tipos da equipa (claro/escuro automático)
- [x] Fase 1 – Meio-campo com 6 jogadores arrastáveis, N.º/Nome, Desfazer, Repor
- [x] Fase 2 – Plantel e banco, substituições, líbero (o plantel fica guardado no dispositivo)
- [ ] Fase 4 – Editor de jogadas por passos
- [ ] Fase 5 – Reprodução animada
- [ ] Fase 6 – Guardar jogadas e sistemas
- [ ] Fase 3 – Sistemas e rotações
- [ ] Fase 7 – Publicar e PWA

## Estrutura

- `src/campo.ts` – geometria do campo (cm), zonas, limites, fórmula de rotação
- `src/plantel.ts` – banco, trocas, líbero e validação de jogadores (funções puras, testadas)
- `src/estado.ts` – estado do quadro (Zustand) com histórico para Desfazer e gravação no dispositivo
- `src/components/Banco.tsx`, `FolhaJogador.tsx`, `Aviso.tsx` – banco, edição de jogador e aviso com Desfazer
- `src/components/Quadro.tsx` – campo em SVG e arrasto com eventos de ponteiro
- `src/styles.css` – tokens do sistema visual da equipa
