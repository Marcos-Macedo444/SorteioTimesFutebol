import { describe, expect, it } from "vitest";
import { cleanPlayerName, extractNameFromLine, parsePlayerNames } from "./playerParser";

describe("playerParser", () => {
  it("extracts only numbered player names from a full match message", () => {
    const input = `
VALOR: IREMOS DEFINIR
Pix: IREMOS DEFINIR
Futebol sexta feira 10/06
21h as 23h Green Ball
LISTA ABERTA

1  Theo
2  Jayme
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
22
23
24

Suplentes:
* Jogo acaba com 2 gols ou 7 minutos
`;

    expect(parsePlayerNames(input)).toEqual([
      "Theo",
      "Jayme",
      "Matheus",
      "Carlin",
      "Brayan",
      "Renan Vieira",
      "Batestin",
      "João Victor",
      "Daniel Calixto",
      "Marquin",
      "Brunin",
      "JG",
      "Josaneo",
      "Gabriel C.",
      "Luiz Fernando",
      "Luiz Henrique",
      "Gabriel Santos",
      "Luiz Filippe",
      "Marquinhos",
      "Kaua Kvn",
      "Matheus #2"
    ]);
  });

  it("accepts common numbering formats and ignores empty numbers", () => {
    expect(extractNameFromLine("1 - Theo")).toBe("Theo");
    expect(extractNameFromLine("2. Jayme")).toBe("Jayme");
    expect(extractNameFromLine("3) Renan Vieira")).toBe("Renan Vieira");
    expect(extractNameFromLine("4")).toBeNull();
  });

  it("removes irrelevant prefixes before the actual name", () => {
    expect(cleanPlayerName("e faixa Marquin")).toBe("Marquin");
    expect(cleanPlayerName("confirmado João Victor")).toBe("João Victor");
    expect(cleanPlayerName("pago JG")).toBe("JG");
    expect(cleanPlayerName("presença Luiz Fernando")).toBe("Luiz Fernando");
  });
});
