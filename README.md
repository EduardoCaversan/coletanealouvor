# Coletânea de Louvor — Hinário

Aplicação web (PWA) para projetar os hinos do Hinário Adventista em culto: **busca em uma tela, vídeo do hino na outra**. Roda em desktop e em celular.

O escopo é deliberadamente pequeno: buscar o hino pelo título ou número, montar a ordem do culto e tocar o vídeo na tela da igreja. Sem letras, sem MP3, sem acervo de CDs.

## Rodando

```bash
npm install
npm run import:hymnal   # gera public/data/hymnal.json (uma vez)
npm run import:videos   # gera public/data/videos.json a partir das playlists
npm run import:bible    # gera public/data/biblia.json (uma vez)
npm run dev             # http://localhost:5173
```

Build de produção:

```bash
npm run build
npm run preview
```

## Como funciona o modo duas telas

| Rota | Papel |
| --- | --- |
| `/` | Controle: hinos, Bíblia, programação do culto e comandos do vídeo, em colunas (uma aba por vez no celular) |
| `/projecao` | Projeção: vídeo ou passagem bíblica, sem nenhum controle visível |

O roteiro aceita hinos, passagens bíblicas e etapas da programação sem vídeo (ex: "Oração", "Sermão"). Os botões **+ Escola Sabatina** e **+ Culto de Sábado**, no topo do roteiro, já carregam a ordem padrão dessas programações; dá pra editar o texto de cada etapa clicando nela, digitar etapas avulsas no campo abaixo dos modelos e arrastar os hinos da busca para os pontos certos. Navegação por teclado e o `stepHymn` pulam as etapas sem hino, indo direto de um hino para o outro.

Programações completas podem ser nomeadas, datadas e salvas no próprio navegador. A lista de programações salvas permite carregar, duplicar e excluir uma programação; carregar trabalho sobre um roteiro alterado pede confirmação. Cada item também aceita uma **nota privada** para lembretes da equipe. Essas notas ficam somente no controle e nunca são enviadas à projeção. O botão **Desfazer** recupera a última alteração feita no roteiro.

O botão **Abrir projeção** abre `/projecao` em uma janela separada. Em Chrome/Edge no desktop, a [Window Management API](https://developer.mozilla.org/docs/Web/API/Window_Management_API) posiciona a janela direto na tela do projetor; nos demais navegadores a janela abre normal e o operador arrasta para a segunda tela.

Não precisa abrir a projeção antes: apertar **Tocar** (ou duplo clique num hino, na busca ou no roteiro) abre a projeção sozinho se ainda estiver fechada, e já toca.

Clicar (uma vez) num hino ou passagem só seleciona, pro painel mostrar o hino/editar o link do vídeo — não mexe no que já está na tela. Só entra no ar de verdade com **Tocar**, duplo clique, `→`/`←` (próximo/anterior) ou o botão **Projetar** da Bíblia; enquanto isso, o painel mostra "Selecionado" em vez de "No ar" e avisa o que continua em cartaz. Isso vale pra tudo: buscar outro hino, trocar a tradução da Bíblia, editar o link de um vídeo — nada disso derruba o que já está projetado.

A sincronia é local, por `BroadcastChannel` — sem servidor, sem latência. O controle publica o que quer (vídeo, tocar/pausar, volume, posição, tela apagada) e a projeção devolve o estado real do player.

**Na primeira vez, clique uma vez na janela de projeção.** O navegador não deixa um vídeo com som começar sozinho em uma janela onde ninguém clicou. Esse clique também entra em tela cheia e vale para o culto inteiro.

### Atalhos de teclado

| Tecla | Ação |
| --- | --- |
| `espaço` | Tocar / pausar |
| `→` `N` | Próximo hino do roteiro (ou próximo versículo, com uma passagem em cartaz) |
| `←` `P` | Hino anterior do roteiro (ou versículo anterior) |
| `B` | Apagar a tela (o vídeo continua rodando por baixo) |
| `F` (na projeção) | Tela cheia |

As teclas funcionam nas duas janelas.

## Vídeos dos hinos

O app precisa saber qual vídeo do YouTube corresponde a cada hino. O mapa vive em `public/data/videos.json`, no formato `{ "<id do hino>": "<id do vídeo>" }`.

`npm run import:videos` monta esse arquivo sozinho: lê as playlists listadas em `scripts/playlists.json`, tira o número do hino do título de cada vídeo ("… Hino 12 …") e casa com o hinário. Ele confere se o título do vídeo bate com o do hinário e avisa quando não bate, sem parar a importação. `--check` relata sem gravar.

Para acrescentar uma playlist, some a URL em `scripts/playlists.json` e rode de novo.

Também dá para cadastrar um hino avulso pela interface: abra o hino e cole o link no campo do painel de comando. O app aceita link normal, `youtu.be`, `/embed/`, `/shorts/` ou o id cru, guarda no navegador (por cima do arquivo) e o botão **Exportar mapeamento** baixa um `videos.json` com tudo.

O player usa `youtube-nocookie.com` com `rel=0`, `modestbranding=1` e `iv_load_policy=3`. Isso tira cookies de rastreio, vídeos relacionados e anotações — **não tira anúncio**. Quem decide se há anúncio é a monetização do vídeo. Um canal não monetizado roda limpo; fora isso, a saída é o operador estar logado com YouTube Premium naquele navegador.

## Hinário

`npm run import:hymnal` grava `public/data/hymnal.json` (~50 KB): id, número e título dos 601 hinos (1 a 600 — o 587 tem as variações A e B). Nada além disso; a busca funciona offline depois da primeira carga, guardada em IndexedDB.

## Passagens bíblicas

`npm run import:bible` grava `public/data/biblia-<versão>.json` (~4 MB cada) com quatro traduções, a partir dos releases de [damarals/biblias](https://github.com/damarals/biblias):

| Sigla | Tradução |
| --- | --- |
| ARA | Almeida Revista e Atualizada |
| ARC | Almeida Revista e Corrigida |
| NTLH | Nova Tradução na Linguagem de Hoje |
| NVI | Nova Versão Internacional |

O script confere se cada livro trouxe o número certo de capítulos e descarta o que passar disso (a fonte já teve nota de rodapé mal separada virando capítulo fantasma — o próprio projeto de origem mantém uma worklist desses casos). `--only ara,arc` gera só as versões pedidas.

Na coluna **Bíblia** (aba própria no celular): escolha o livro (em colunas, ordem ajustável na engrenagem), o capítulo e o(s) versículo(s) — capítulo e versículo são grades só de número, pra selecionar rápido; shift-clique estende o intervalo e o texto escolhido aparece embaixo da grade antes de confirmar. **Projetar** manda a passagem pra tela e **+** acrescenta ao roteiro. Passagem não tem som, então a projeção mostra direto, sem pedir o clique de ativação (esse clique continua valendo pra vídeo). A passagem some o vídeo da projeção enquanto está em cartaz; **Encerrar passagem** ou abrir outro hino volta ao normal.

O ícone de engrenagem (mesma linha da busca, e também no cabeçalho do capítulo/versículo) reúne toda a configuração: tradução (ARA/ARC/NTLH/NVI — troca atualiza a projeção na hora, mesmo com passagem em cartaz), ordem dos livros (ordem da Bíblia ou A-Z) e a aparência da passagem na projeção (tamanho da fonte, cor de fundo e da letra). Fica salvo no navegador.

Sem os arquivos gerados, a busca de hinos continua funcionando normalmente — só a aba Bíblia fica indisponível.

## Estrutura

```
scripts/import-hymnal.mjs   Gera o índice do hinário
scripts/import-videos.mjs   Gera o mapa hino -> vídeo a partir das playlists
scripts/import-bible.mjs    Gera o texto da Bíblia
scripts/playlists.json      Playlists do YouTube usadas na importação
src/lib/bible.ts            Recorte e referência de passagens bíblicas
src/lib/bibleVersions.ts    Catálogo das traduções disponíveis (ARA, ARC, NTLH, NVI)
src/lib/passageStyle.ts     Tipo e padrão da aparência da passagem na projeção
src/lib/channel.ts          Canal controle <-> projeção
src/lib/templates.ts        Modelos de programação (culto de sábado, escola sabatina)
src/lib/screens.ts          Descoberta de telas e abertura da janela de projeção
src/lib/storage.ts          Cache do índice (IndexedDB), mapa de vídeos, preferências
src/lib/youtube.ts          Leitura de link do YouTube
src/lib/useLive.ts          Lado do controle do canal
src/store/useApp.ts         Estado global (zustand)
src/routes/Control.tsx      Tela de controle
src/routes/Display.tsx      Tela de projeção (IFrame Player API)
```

Stack: React 19, Vite 6, Tailwind 4, Radix (componentes no padrão shadcn/ui), zustand, dnd-kit, vite-plugin-pwa.

## Navegador

Chrome ou Edge dão o posicionamento automático das telas. Brave funciona e bloqueia anúncio do YouTube, mas o anti-fingerprint dele pode esconder as telas disponíveis e o Shields em modo agressivo às vezes derruba o embed — teste antes do culto, não no culto.

## Deploy

Qualquer host estático serve. É preciso apontar todas as rotas para `index.html` (SPA); `public/_redirects` já cobre Netlify. Para Vercel, um `vercel.json` com rewrite de `/(.*)` para `/index.html`; para Nginx, `try_files $uri /index.html`.

**GitHub Pages:** `.github/workflows/deploy-pages.yml` builda e publica a cada push em `master` (ative uma vez em Settings → Pages → Source: GitHub Actions). Como um Pages de projeto serve em `/<repo>/` em vez da raiz, o build usa `BASE_PATH=/<repo>/`; localmente isso não é necessário (`npm run build` sem a variável já serve da raiz, para Netlify/Vercel/Nginx).
