# languageHub

Caderno digital de inglês para revisão de vestibular e ENEM: flashcards com repetição espaçada (SM-2), quizzes de texto, áudio e vídeo, diagnóstico de pontos fracos, ofensiva e XP.

Projeto da disciplina Experiência Criativa (PUCPR). Equipe: Giovanna, Pedro, Ashley, Cristian e Otávio.

## Como abrir

- **Online (GitHub Pages):** Settings → Pages → Source: *Deploy from a branch* → Branch `main`, pasta `/ (root)` → Save. Em 1 a 2 minutos o site fica em `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.
- **No computador:** dentro da pasta, rode `python3 -m http.server 8000` e abra `http://localhost:8000` (abrir o `index.html` direto com dois cliques não funciona, porque o navegador bloqueia a leitura do `data/content.json`).

## Conteúdo

24 temas, 220 questões e 114 flashcards de inglês do ensino médio, em 5 grupos: tempos verbais, estruturas gramaticais, vocabulário, leitura para vestibular, ouvir e assistir.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `index.html` | Estrutura da página |
| `css/styles.css` | Visual (caderno verde-claro, cores dos temas, versão celular) |
| `js/store.js` | Progresso salvo no navegador |
| `js/srs.js` | Repetição espaçada SM-2 |
| `js/xp.js` | XP, ofensiva e ranking |
| `js/search.js` | Busca sem acento com filtros |
| `js/ui.js` | Ícones, voz e componentes visuais |
| `js/cloud.js` | Ranking da turma (só funciona no link publicado no Claude) |
| `js/app.js` | Telas e fluxos do app |
| `data/content.json` | Temas, questões e flashcards |
| `data/media/` | Áudios e vídeos das questões |

No GitHub Pages, o ranking mostra alunos de exemplo e o listening usa a voz do próprio navegador.
