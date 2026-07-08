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
