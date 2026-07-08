# Sorteador de Times da Pelada

Site front-end only para sortear times de futebol/pelada de forma prática. O usuário cola a mensagem completa da pelada, o sistema extrai apenas os nomes, permite definir estrelas, sorteia times equilibrados, copia o resultado para WhatsApp, exporta em PDF e também gera uma nova mensagem completa substituindo a lista original pelos times sorteados.

## Criador

Criado por Marcos Macêdo  
Site: https://marcosmacedo.dev/

© 2026 Marcos Macêdo. Todos os direitos reservados.

## Funcionalidades

- Extração inteligente de nomes em listas numeradas.
- Edição, adição e remoção manual de jogadores.
- Habilidades por estrelas de 1 a 5.
- Opção "Não conheço" com estrela interna sorteada a cada sorteio.
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

## Testes e lint

```bash
npm run test
npm run lint
```

Os testes cobrem parser, linhas vazias, prefixos irrelevantes, nomes repetidos, desconhecidos com estrelas sorteadas, vagas sobrando, suplentes, WhatsApp, substituição da lista original e créditos do criador.

## Deploy grátis no Render

Crie um Static Site no Render apontando para este repositório.

- Build command: `npm install && npm run build`
- Publish directory: `dist`

O arquivo `render.yaml` também documenta a configuração:

```yaml
services:
  - type: web
    name: sorteio-times-futebol
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: dist
```

## Como usar

1. Cole a mensagem completa da pelada.
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

Ele ignora Pix, valor, data, local, horários, regras, emojis, títulos e linhas numeradas vazias como `22`, `23` e `24`. Também normaliza espaços, preserva nomes compostos, mantém abreviações como `JG` e remove prefixos comuns antes do nome, como `e faixa`, `faixa`, `confirmado`, `pago`, `ok` e `presença`.

Nomes repetidos são mantidos como jogadores separados, por exemplo `Matheus` e `Matheus #2`.

## Regra do "Não conheço"

Jogadores marcados como `Não conheço` não ficam com 3 estrelas fixas. Em cada sorteio, o algoritmo atribui internamente uma estrela entre 1 e 5, considerando:

- média dos jogadores conhecidos;
- quantidade de jogadores fortes;
- quantidade de jogadores fracos;
- quantidade de desconhecidos;
- quantidade de times.

Esse valor vale apenas para o sorteio atual. Ao sortear novamente, outro valor interno pode ser usado. Na tela, no WhatsApp e no PDF, o jogador continua aparecendo como `Não conheço`, mas com a estrela aplicada de forma discreta para transparência.

Exemplo:

```text
* JG — Não conheço ⭐⭐⭐
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

Além de copiar somente o resultado, o app consegue gerar uma mensagem completa baseada no texto original. Ele mantém valor, Pix, data, horário, local, avisos e regras, remove a lista numerada antiga e insere `⚽ TIMES SORTEADOS` no lugar.

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
