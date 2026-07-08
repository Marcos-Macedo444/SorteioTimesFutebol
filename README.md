# Sorteador de Times da Pelada

Aplicação web front-end only para organizar sorteios de times de futebol de pelada. O sistema extrai nomes de uma mensagem completa, permite definir habilidade por estrelas, trata jogadores marcados como "Não conheço", sorteia times equilibrados e usa histórico local para reduzir repetições entre peladas.

## Tecnologias

- React
- Vite
- TypeScript
- Vitest
- ESLint
- localStorage

Não há backend, banco de dados ou login obrigatório.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite, normalmente `http://localhost:5173`.

## Build de produção

```bash
npm run build
```

Os arquivos finais ficam em `dist`.

## Testes e lint

```bash
npm run test
npm run lint
```

Os testes cobrem o parser de nomes, linhas vazias, prefixos irrelevantes, nomes repetidos, balanceamento básico e distribuição de jogadores desconhecidos.

## Como usar

1. Cole a mensagem completa da pelada no campo de entrada.
2. Clique em `Extrair nomes`.
3. Revise os jogadores extraídos, edite nomes se precisar e defina a habilidade.
4. Configure quantidade de times, jogadores por time e nomes dos times.
5. Clique em `Sortear times`.
6. Use `Copiar resultado` para mandar o texto no WhatsApp.

Também é possível importar e exportar jogadores com estrelas em JSON.

## Extração de nomes

O parser detecta linhas que começam com número seguido de nome, aceitando formatos como:

- `1 Theo`
- `1  Theo`
- `1 - Theo`
- `1. Theo`
- `1) Theo`

Linhas numeradas vazias são ignoradas. O sistema preserva nomes compostos, normaliza espaços, capitaliza nomes de forma amigável e mantém abreviações como `JG`. Prefixos comuns antes do nome, como `e faixa`, `faixa`, `confirmado`, `pago` e `ok`, são removidos.

Se houver nomes repetidos, o app mantém todos os jogadores e diferencia a partir do segundo, por exemplo `Matheus` e `Matheus #2`.

## Como funciona o sorteio

Cada habilidade recebe um peso:

- 1 estrela = 1
- 2 estrelas = 2
- 3 estrelas = 3
- 4 estrelas = 4
- 5 estrelas = 5
- Não conheço = peso provisório 3

O algoritmo gera várias tentativas, embaralha os jogadores, distribui priorizando o time mais fraco no momento e calcula uma pontuação de equilíbrio. A melhor tentativa é escolhida.

A pontuação considera:

- diferença de soma de estrelas;
- diferença de média;
- diferença de quantidade de jogadores;
- distribuição de jogadores fortes e fracos;
- distribuição de jogadores marcados como "Não conheço";
- penalidade para pares que já caíram juntos no histórico recente.

## Tratamento de "Não conheço"

Jogadores desconhecidos usam peso provisório 3 para não quebrar o cálculo, mas continuam aparecendo como "Não conheço" na interface e no texto copiado. O algoritmo aplica penalidade quando um time já tem desconhecidos, espalhando esses jogadores entre os times sempre que possível.

## Histórico local

O app salva os últimos 20 sorteios no `localStorage`, incluindo data, times e pares de jogadores que caíram juntos. Em novos sorteios, esses pares recebem uma penalidade leve para reduzir a chance de repetir os mesmos grupos.

O histórico é apenas uma ajuda, não uma trava absoluta. O equilíbrio das estrelas continua sendo prioridade.

## Persistência

São salvos no navegador:

- texto colado;
- jogadores e habilidades;
- configurações do sorteio;
- histórico dos últimos sorteios.

Limitação: por ser front-end only, esses dados ficam apenas no navegador/dispositivo usado. Se limpar os dados do site ou abrir em outro navegador, o histórico não será compartilhado.

## Deploy gratuito no Render

Crie um novo Static Site no Render apontando para este repositório.

Configuração:

- Build command: `npm install && npm run build`
- Publish directory: `dist`

O arquivo `render.yaml` já deixa essa configuração documentada para deploy como site estático.
