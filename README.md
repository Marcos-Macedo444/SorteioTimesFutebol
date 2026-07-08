# Sorteador de Times da Pelada

Site front-end only para sortear times de futebol/pelada de forma prática. O usuário cola a mensagem completa da pelada, mesmo com valor, Pix, horário, local, regras e avisos; o sistema ignora esse contexto, extrai apenas os jogadores numerados, permite definir estrelas, sorteia times equilibrados, copia o resultado para WhatsApp, exporta em PDF e também gera uma nova mensagem completa substituindo a lista original pelos times sorteados.

## Criador

Criado por Marcos Macêdo  
Site: https://marcosmacedo.dev/

© 2026 Marcos Macêdo. Todos os direitos reservados.

## Funcionalidades

- Extração inteligente de nomes em listas numeradas.
- Edição, adição e remoção manual de jogadores.
- Habilidades por estrelas de 1 a 5.
- Opção "Não conheço" com peso médio fixo de 3 estrelas no cálculo.
- Sorteio balanceado por força, média, fortes, fracos, desconhecidos e histórico.
- Vagas sobrando quando faltam jogadores para a configuração escolhida.
- Suplentes quando há mais jogadores que vagas no primeiro sorteio.
- Histórico local dos últimos 20 sorteios para reduzir repetição de pares.
- Copiar resultado pronto para WhatsApp.
- Copiar mensagem completa da pelada com a lista original substituída pelos times.
- Exportar PDF via janela de impressão.
- Importar e exportar jogadores em JSON.
- Persistência local com `localStorage`.

## Tecnologias

- React
- Vite
- TypeScript
- Vitest
- ESLint
- localStorage

Não há backend, banco de dados ou login.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite, normalmente `http://localhost:5173`.

## Build

```bash
npm run build
```

Os arquivos finais são gerados em `dist`.

## Preview local do build

```bash
npm run preview
```

Use esse comando depois do build para conferir localmente uma versão parecida com a publicação final.

## Testes e lint

```bash
npm run test
npm run lint
```

Os testes cobrem parser, linhas vazias, prefixos irrelevantes, nomes repetidos, desconhecidos com peso médio fixo, vagas sobrando, suplentes, WhatsApp, substituição da lista original, input numérico mobile, favicon e créditos do criador.

## Deploy grátis na Vercel

Este projeto está pronto para deploy na Vercel como app Vite estático.

Configuração esperada:

- Framework Preset: `Vite`
- Root Directory: `./`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Este projeto não precisa de variáveis de ambiente na Vercel.

Também não foi criado `vercel.json`, porque o app não usa React Router nem rotas internas. Ele é uma tela única em `/`. Se no futuro forem adicionadas rotas internas de SPA, pode ser necessário criar um `vercel.json` com rewrite para `/index.html`.

## Como usar

1. Cole a mensagem completa da pelada, incluindo valor, Pix, horário, local, regras e avisos.
2. Clique em `Extrair nomes`.
3. Revise os jogadores e defina estrelas ou `Não conheço`.
4. Configure quantidade de times e jogadores por time.
5. Clique em `Sortear times`.
6. Copie somente o resultado ou a mensagem completa com os times.
7. Exporte o PDF se quiser compartilhar ou arquivar.

## Parser de nomes

O parser detecta linhas que começam com número seguido de nome:

- `1 Theo`
- `1  Theo`
- `1 - Theo`
- `1. Theo`
- `1) Theo`

Ele ignora Pix, valor, data, local, horários, regras, emojis, títulos e linhas numeradas vazias como `22`, `23` e `24`. O sistema extrai somente linhas numeradas com jogadores. Também normaliza espaços, preserva nomes compostos, mantém abreviações como `JG` e remove prefixos comuns antes do nome, como `e faixa`, `faixa`, `confirmado`, `pago`, `ok` e `presença`.

Nomes repetidos são mantidos como jogadores separados, por exemplo `Matheus` e `Matheus #2`.

## Regra do "Não conheço"

Jogadores marcados como `Não conheço` entram no cálculo com peso médio de 3 estrelas, para manter o sorteio justo sem favorecer ou prejudicar nenhum time.

Esse valor é fixo no cálculo. Ao sortear novamente, o jogador desconhecido continua valendo 3 estrelas. Na tela, no WhatsApp e no PDF, ele aparece apenas como `Não conheço`.

Exemplo:

```text
* JG — Não conheço
```

## Vagas sobrando

Se a configuração pedir mais vagas do que jogadores disponíveis, o sorteio acontece mesmo assim. As vagas vazias aparecem como `Vaga Sobrando`:

```text
* Carlos ⭐⭐⭐
* João ⭐⭐
* *Vaga Sobrando*
```

Essas vagas aparecem na tela, no texto copiado para WhatsApp e no PDF.

## Suplentes

Se houver mais jogadores do que vagas configuradas, o sistema sorteia o primeiro grupo e coloca os excedentes em `Suplentes`. Eles aparecem na tela, no WhatsApp e no PDF.

## Mensagem completa com times

Além de copiar somente o resultado, o app consegue gerar uma mensagem completa baseada no texto original. Ele mantém valor, Pix, data, horário, local, avisos e regras, remove a lista numerada antiga e insere `⚽ TIMES SORTEADOS` no lugar. Assim a mensagem final pode preservar as informações originais e substituir apenas a lista pelos times sorteados.

Exemplo de entrada:

```text
VALOR: IREMOS DEFINIR

LISTA ABERTA

1 Theo
2 Jayme

⚠️ Regras do FUT
* Jogo acaba com 2 gols
```

Exemplo de saída:

```text
VALOR: IREMOS DEFINIR

⚽ TIMES SORTEADOS

Time 1
* Theo ⭐⭐⭐

Time 2
* Jayme ⭐⭐⭐

⚠️ Regras do FUT
* Jogo acaba com 2 gols
```

## Histórico local

O app salva os últimos 20 sorteios no navegador, incluindo times e pares de jogadores que caíram juntos. Em novos sorteios, esses pares recebem penalidade leve para reduzir repetição, sem travar o equilíbrio.

Limitação: por ser front-end only, os dados ficam apenas no navegador usado. Outro dispositivo ou navegador não compartilha o histórico.
