# Coletânea de Louvor — Central de culto

Console gratuito e local-first para operar músicas, Bíblia, apresentações e roteiro, com uma janela separada de projeção. Sem login, backend ou upload de arquivos.

Publicado em https://eduardocaversan.github.io/coletanealouvor/

## Operação

1. Abra **Abrir projeção** e mova a janela para o telão. Duplo clique na projeção ou F alterna tela cheia.
2. Busque um hino, referência bíblica ou arquivo. A seleção entra em **Preview**.
3. Confira o Preview e clique **Colocar no ar**. Para vídeos, clique uma vez na projeção para liberar o som e use **Iniciar** no controle.
4. **Anterior / Próximo** percorrem slides ou versículos no ar. A Bíblia continua entre capítulos e livros.
5. **Apagar tela** cobre a projeção sem destruir o conteúdo. O áudio continua; use Pausar para interrompê-lo.

Selecionar, pesquisar e editar nunca substituem o conteúdo no ar. Notas do roteiro são privadas. Etapas como oração e sermão podem ser marcadas em curso sem mudar o telão. O próximo item do roteiro tem sua própria ação **Preparar próximo**.

| Atalho         | Ação                                               |
| -------------- | -------------------------------------------------- |
| Ctrl / Cmd + K | Busca global, incluindo referências como João 3:16 |
| Enter          | Colocar Preview no ar                              |
| Espaço         | Iniciar / pausar vídeo ou timer no ar              |
| ← / P e → / N  | Versículo ou slide anterior / próximo no ar        |
| B              | Blackout                                           |
| ?              | Ajuda                                              |

Atalhos de operação ficam inativos durante digitação e em diálogos. O modo simples reduz ajustes secundários e usa a capa do vídeo no monitor para consumir menos recursos.

## Conteúdo e armazenamento

- Hinário completo, ordenado por número; associação de vídeo editável.
- Bíblia: ARA, ARC, NTLH e NVI; busca por referência e seleção visual. Passagens são percorridas um versículo de cada vez, sem parar no final da seleção.
- Programações nomeadas e datadas, modelos, reordenação, duplicação, notas e desfazer a última alteração.
- Favoritos, recentes, links próprios de YouTube, texto rápido, tela de espera, contagem privada/projetável e sorteio de números ou nomes.
- Recuperação opcional após recarregar: conteúdo restaurado com blackout e playback pausado.
- PDF, PNG, JPG/JPEG e WebP por seletor ou arrastar. Imagens podem formar uma sequência.

PDF.js converte cada página em um slide estático de até 2560×1440, mantendo proporções. Fontes, mapas de caracteres e worker são servidos pelo próprio site. Arquivos de até 100 MB e PDFs de até 300 páginas; documentos protegidos por senha precisam ser desbloqueados antes. Não há suporte a animações, áudio embutido ou edição de slides.

**PPT/PPTX:** exporte como PDF no PowerPoint/LibreOffice. A alternativa [PPTXjs](https://github.com/meshesha/PPTXjs) foi examinada, mas suas dependências antigas e limitações de renderização não justificam prometer fidelidade ao vivo.

Arquivos e miniaturas ficam em IndexedDB; preferências, roteiro e referências ficam no armazenamento local. Importações incompletas são descartadas, e erros de armazenamento são informados. Limpar os dados do site remove o acervo local: mantenha os originais. Não há sincronização ou backup remoto.

YouTube requer internet e pode apresentar anúncios, restrições de incorporação ou indisponibilidade. O monitor de vídeo do operador é mudo e sincronizado aproximadamente com a posição informada pela projeção; não é captura do telão.

## Biblioteca musical inicial

Metadados, links e reprodução incorporada verificados em 26/09/2026 UTC:

- **Adoradores 4:** Estou Aqui, Seja o Centro e Levanto a Cruz, em publicações da Gravadora Novo Tempo.
- **Novo Tom:** O Melhor Lugar do Mundo (Ao Vivo), publicado pela Rede Novo Tempo de Comunicação.
- **Instrumentais:** Jader Santos — 3 horas de piano (Gravadora Novo Tempo); 1 hora instrumental piano — A sós com Deus (Matheus Rizzo).

As referências e fontes individuais estão em [src/lib/music.ts](src/lib/music.ts). A seleção não pretende representar álbuns completos nem a ordem original das faixas. Nenhuma mídia, letra de música ou capa foi copiada para o repositório; as miniaturas são remotas.

## Desenvolvimento e validação

```sh
npm ci
npm run import:hymnal
npm run import:bible
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:smoke
npm run build
```

O mapa curado de vídeos está em public/data/videos.json. Atualização opcional: npm run import:videos, com playlists em scripts/playlists.json. Traduções bíblicas usam os releases de [damarals/biblias](https://github.com/damarals/biblias).

O lint existente é um alias de typecheck. Smoke tests usam Edge instalado, duas janelas, um PDF de teste gerado e imagens locais. SMOKE_BROWSER=chrome seleciona Chrome. SMOKE_URL permite testar um build servido em outro endereço e habilita o teste de PWA offline. Reprodução real de YouTube e posicionamento físico das telas exigem validação manual.

## Arquitetura e publicação

React, TypeScript, Vite, Zustand, IndexedDB, PDF.js e PWA. Content é uma união discriminada; resolveContent cria um frame público com campos permitidos. ContentScreen compartilha composição entre Preview e Display. Notas não entram nesse frame. Arquivos trafegam por referências locais, nunca como blobs no canal entre janelas.

O roteiro antigo continua compatível. O banco de mídia é independente do cache de Bíblia/hinário. BroadcastChannel comunica as janelas; eventos de storage são a alternativa local.

O workflow de GitHub Pages usa BASE_PATH=/coletanealouvor/ e copia index.html para 404.html. O worker de PDF, suas fontes e os chunks estão no precache da PWA; dados bíblicos são armazenados após o primeiro carregamento. Atualizações não forçam recarga durante o culto: feche as janelas e reabra o aplicativo entre sessões para atualizar.

Antes de mergear, teste no equipamento da igreja: segunda tela, tela cheia, áudio e anúncios do YouTube, legibilidade do PDF real e leitura bíblica à distância.
