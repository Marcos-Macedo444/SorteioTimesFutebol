import { describe, expect, it } from "vitest";
import type { DrawResult } from "../types";
import { generateFullMessageWithDraw } from "./originalMessage";

describe("originalMessage", () => {
  it("replaces the original numbered list with the generated teams and keeps the context", () => {
    const original = `VALOR: IREMOS DEFINIR💰

Pix: IREMOS DEFINIR

Futebol sexta feira 10/06

21h as 23h Green Ball

LISTA ABERTA

1  Theo
2  Jayme
3  Matheus
4  Carlin
5

Suplentes:

⚠️🚨 Regras do FUT: ⚠️🚨

* Jogo acaba com 2 gols ou 7 minutos marcados no celular de alguem;
* Empatou? Saí os 2 times`;

    const result = createResult();
    const generated = generateFullMessageWithDraw(original, result);

    expect(generated).toContain("VALOR: IREMOS DEFINIR💰");
    expect(generated).toContain("Pix: IREMOS DEFINIR");
    expect(generated).toContain("⚽ TIMES SORTEADOS");
    expect(generated).toContain("* Theo ⭐⭐⭐");
    expect(generated).toContain("* JG — Não conheço");
    expect(generated).not.toContain("sorteado como");
    expect(generated).toContain("* *Vaga Sobrando*");
    expect(generated).toContain("⚠️🚨 Regras do FUT: ⚠️🚨");
    expect(generated).not.toContain("LISTA ABERTA");
    expect(generated).not.toContain("1  Theo");
    expect(generated).not.toContain("Suplentes:\n\n⚠️🚨");
  });

  it("preserves all context before and after the real player list example", () => {
    const original = `VALOR: R$ 19,00💰
Pix: 27988105707

Nome: Marcos Filipe de Paula Macêdo
Banco: Nubank

Futebol sexta feira 10/06
21h as 23h Green Ball
(2) HORAS DE FUTEBOL

LISTA ABERTA

1. Theo
   2 Jayme
   3  Matheus
   4 carlin
   5 Brayan
   6 Renan Vieira
   7 Batestin
   8 João Victor
   9 daniel Calixto
   10 e faixa Marquin
   11 Brunin
   12 JG
   13 Josaneo
   14 Gabriel C.
   15 Luiz Fernando
   16 Luiz Henrique
   17 Gabriel Santos
   18  Luiz Filippe
   19 Marquinhos
   20 kaua kvn
   21 Matheus
   22 samuel
   23 emanuel
   24 bryan

Suplentes:

⚠️🚨 Regras do FUT: ⚠️🚨

* Jogo acaba com 2 gols ou 7 minutos marcados no celular de alguem;
* Tempo esgotou, sair LINHA DE FUNDO o jogo acaba;`;

    const generated = generateFullMessageWithDraw(original, createResult());

    expect(generated).toContain("VALOR: R$ 19,00💰");
    expect(generated).toContain("Pix: 27988105707");
    expect(generated).toContain("Nome: Marcos Filipe de Paula Macêdo");
    expect(generated).toContain("Banco: Nubank");
    expect(generated).toContain("Futebol sexta feira 10/06");
    expect(generated).toContain("21h as 23h Green Ball");
    expect(generated).toContain("(2) HORAS DE FUTEBOL");
    expect(generated).toContain("(2) HORAS DE FUTEBOL\n\n⚽ TIMES SORTEADOS");
    expect(generated).toContain("* JG — Não conheço");
    expect(generated).toContain("* *Vaga Sobrando*");
    expect(generated).toContain("⚠️🚨 Regras do FUT: ⚠️🚨");
    expect(generated).toContain("* Tempo esgotou, sair LINHA DE FUNDO o jogo acaba;");
    expect(generated).not.toContain("LISTA ABERTA");
    expect(generated).not.toContain("1. Theo");
    expect(generated).not.toContain("24 bryan");
    expect(generated).not.toContain("Suplentes:\n\n⚠️🚨");
  });
});

function createResult(): DrawResult {
  return {
    id: "draw-1",
    createdAt: "2026-01-01T12:00:00.000Z",
    teams: [
      {
        id: "team-1",
        name: "Time 1",
        players: [
          { id: "1", name: "Theo", skill: 3, appliedSkill: 3, wasUnknown: false },
          { id: "2", name: "JG", skill: "unknown", appliedSkill: 3, wasUnknown: true }
        ],
        targetSize: 3,
        vacancyCount: 1,
        totalSkill: 6,
        averageSkill: 3,
        unknownCount: 1,
        strongCount: 0,
        weakCount: 0
      },
      {
        id: "team-2",
        name: "Time 2",
        players: [{ id: "3", name: "Jayme", skill: 4, appliedSkill: 4, wasUnknown: false }],
        targetSize: 3,
        vacancyCount: 2,
        totalSkill: 4,
        averageSkill: 4,
        unknownCount: 0,
        strongCount: 1,
        weakCount: 0
      }
    ],
    substitutes: [{ id: "4", name: "Matheus #2", skill: 3, appliedSkill: 3, wasUnknown: false }],
    balance: {
      totalRange: 2,
      averageRange: 1,
      unknownRange: 1,
      playerCountRange: 1,
      vacancyRange: 1,
      historyPenalty: 0,
      score: 10
    },
    observation: "Sorteio equilibrado.",
    copiedText: ""
  };
}
