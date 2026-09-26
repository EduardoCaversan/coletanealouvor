# Identidade Ekklesia

**Ekklesia** · **Seu culto. Uma única central.**

O símbolo é um E geométrico: um frame aberto, com a barra central avançando para sugerir conteúdo entrando em projeção. Sem ilustração religiosa literal, efeitos ou gradientes. O wordmark usa tipografia de sistema; o símbolo permanece idêntico em todas as escalas.

## Aplicação

- Grafite `#101116`, superfícies `#18191f`, texto `#f2f1f7`, violeta `#b9afff`.
- Live coral, Preview azul, sucesso verde e atenção âmbar são estados independentes da marca. Os tokens ficam em `src/index.css`.
- SVGs originais em `public/brand/`; versão monocromática usa `currentColor`.
- `npm run brand:icons` rasteriza os vetores localmente com Playwright/Edge (`SMOKE_BROWSER=chrome` como alternativa). Gera PNGs, ICO e imagem social, sem rede. Ícone maskable mantém o símbolo na área segura.
- Marca no console, README e metadata. Nenhum watermark ou tela de marca no Display ao encerrar.

## Migração

A URL oficial passa a ser https://eduardocaversan.github.io/ekklesia/. O manifest usa o novo path para `id`, `scope` e `start_url`. O service worker tem seu próprio escopo e caches Ekklesia; não desregistra outros workers nem apaga caches de outras instalações.

Os nomes internos históricos `coletanea` (cache de dados), `coletanea-media` (arquivos) e o prefixo `coletanea:` (preferências/programações) são mantidos deliberadamente para preservar dados existentes. São compatibilidade com a origem do projeto, não branding público. IndexedDB/localStorage são compartilhados por origem, não por path: no mesmo navegador e domínio, os dados existentes continuam acessíveis. Domínios ou perfis diferentes não são migrados automaticamente.

O canal ao vivo e o nome da janela usam Ekklesia, evitando que uma janela antiga controle a nova projeção. Feche as janelas antigas antes de usar a nova versão. A PWA anterior precisa ser substituída pela instalação da nova URL; não limpe os dados do domínio, pois isso remove o acervo local.

O rename do repositório não publica o conteúdo desta branch: após revisar e fazer merge da PR, aguarde o workflow de Pages. Até lá, o site pode manter a versão anterior ou ficar indisponível no novo endereço. Não há merge automático.

A origem é atribuída no README e o histórico/autoria permanecem intactos. Nenhum arquivo de licença foi removido; não havia licença explícita identificada no estado herdado.
