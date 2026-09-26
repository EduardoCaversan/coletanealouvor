# Ekklesia

<img src="public/brand/wordmark.svg" width="330" alt="Ekklesia" />

**Seu culto. Uma única central.**

Free, local-first worship presentation console for churches.

[Abrir Ekklesia](https://eduardocaversan.github.io/ekklesia/) · [Inventário musical](docs/music-library-status.md) · [Identidade e migração](docs/brand.md)

## O que é o Ekklesia?

Uma central para planejar, operar e projetar cultos pelo navegador. Prepare o próximo conteúdo enquanto a igreja continua vendo o que está no ar. Músicas, Bíblia, apresentações, roteiro e ferramentas ficam no mesmo ambiente, com uma janela separada para o projetor.

**Selecionar não é projetar.** Busque e confira no Preview; use **Colocar no ar** quando estiver pronto.

## Principais recursos

### Operação ao vivo

Live e Preview visuais, próximo conteúdo, transporte, modo simples e atalhos. **Apagar tela** esconde temporariamente sem destruir o conteúdo nem silenciar o áudio. **Encerrar** para a apresentação, limpa Live/Preview e deixa a projeção preta — sem logo ou propaganda.

### Conteúdo

Hinário Adventista por número, Bíblia em ARA/ARC/NTLH/NVI com navegação contínua entre capítulos e livros, vídeos do YouTube e biblioteca adventista por álbum/categoria. São 941 faixas em 91 coleções/seleções além do hinário, incluindo CDs Jovens, adoração infantil, ofertas/doxologia e instrumentais. [Fontes, cobertura de letras e lacunas](docs/music-library-status.md) são explícitas; disponibilidade externa pode mudar.

PDF, PNG, JPG/JPEG e WebP podem ser arrastados para a biblioteca. Cada página do PDF vira um slide; imagens podem formar uma sequência, com thumbnails e navegação. **PowerPoint: exporte como PDF.** Não há suporte direto a PPT/PPTX, animações ou áudio embutido. Limites: 100 MB por arquivo e 300 páginas por PDF; guarde os originais.

### Planejamento

Programações nomeadas/datadas, modelos, reordenação, duplicação, notas privadas e desfazer da última alteração. Etapas como oração e sermão organizam o roteiro sem necessariamente projetar conteúdo. **Notas privadas nunca são enviadas ao Display.**

### Ferramentas

Texto rápido/tela de espera, timer privado ou projetável, favoritos, recentes e busca global. Sorteio de números/nomes com não repetição, revelação animada e histórico no projetor. Os vencedores são escolhidos antes da animação; o histórico permanece até ser explicitamente limpo.

## Por que Ekklesia?

Gratuito, de código público, sem conta, assinatura ou backend obrigatório. A operação e os arquivos ficam no navegador: uma proposta simples para equipes pequenas ou maiores, sem infraestrutura própria para administrar. A PWA oferece recursos offline após o carregamento; **YouTube e thumbnails externos precisam de internet**.

## Comece a operar

1. Abra [a aplicação](https://eduardocaversan.github.io/ekklesia/) e clique **Abrir projeção**. Permita pop-ups e mova a janela para o telão.
2. Busque e prepare um conteúdo; confira o Preview e clique **Colocar no ar**.
3. Para vídeos, clique uma vez na projeção para liberar o som e use **Iniciar** no controle.
4. Use **Anterior/Próximo** para slides e versículos. Duplo clique ou **F** na projeção alterna tela cheia.
5. Antes do culto, execute a verificação do sistema e confira som, legibilidade e vídeos no equipamento real.

| Atalho | Ação |
|---|---|
| Ctrl / Cmd + K | Busca global, incluindo referências como João 3:16 |
| Enter | Colocar Preview no ar |
| Espaço | Iniciar/pausar vídeo ou timer no ar |
| ← / P e → / N | Slide ou versículo anterior/próximo no ar |
| B | Blackout |
| ? | Ajuda de atalhos |

Atalhos de operação não interceptam digitação em campos e diálogos. O monitor de vídeo do operador é mudo e tem sincronização aproximada; não é uma captura do projetor.

## Rodando localmente

Com Node.js compatível com as dependências do projeto:

```sh
npm ci
npm run import:hymnal
npm run import:bible
npm run dev
```

Abra o endereço `/ekklesia/` informado pelo Vite. `npm run import:videos` gera opcionalmente o mapa de vídeos do hinário consultando playlists públicas (melhor esforço). O catálogo musical também permite adicionar links próprios.

```sh
npm run typecheck
npm run lint
npm test
node scripts/validate-music.mjs
npm run test:smoke
npm run build
```

O lint atual é um alias de typecheck. Smoke tests usam Edge instalado; `SMOKE_BROWSER=chrome` seleciona Chrome. `SMOKE_URL` permite testar um build servido separadamente, incluindo a PWA offline.

O build usa `/ekklesia/` por padrão; `BASE_PATH` permite outro destino. O workflow de Pages usa o nome real do repositório, mantém typecheck/testes e cria `404.html` para as rotas da aplicação. Não é necessário servidor de aplicação.

## Privacidade e dados

Programações, preferências, favoritos e histórico são persistidos localmente; arquivos e thumbnails importados ficam em IndexedDB. Não há upload de arquivos, telemetria ou sincronização cloud próprios. YouTube e outras fontes externas recebem as requisições necessárias para os conteúdos remotos e seguem suas próprias políticas.

Limpar os dados do site remove o acervo local. Mantenha seus arquivos originais: armazenamento do navegador não é backup. A recuperação de sessão é opcional, com tela apagada e vídeo pausado. Feche as janelas e reabra entre sessões para receber atualizações, não durante uma apresentação.

A mudança de nome preserva os identificadores históricos de armazenamento no mesmo domínio, sem apagar caches ou bancos antigos. Instalações PWA antigas não migram automaticamente para a nova URL; veja [as orientações de migração](docs/brand.md#migração).

## Origem do projeto

Ekklesia nasceu de um fork do projeto de código público [Coletânea de Louvor, de Jackson Alexandre](https://github.com/jacksonalexandre/coletanealouvor), e evoluiu para uma direção independente de produto, com foco em operação completa de cultos, experiência local-first e ferramentas de apresentação. O histórico Git e a autoria das contribuições foram preservados.

As traduções bíblicas são importadas dos releases de [damarals/biblias](https://github.com/damarals/biblias). As fontes do catálogo musical estão registradas no [inventário](docs/music-library-status.md).

## Licença

O estado herdado do repositório não contém um arquivo `LICENSE` nem uma concessão explícita de licença identificada. O rebrand não acrescenta uma licença ou altera a autoria do código. Até que os titulares esclareçam o licenciamento, não se deve presumir uma licença open-source específica. As dependências e os conteúdos referenciados mantêm suas próprias licenças e direitos.
