import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("App footer credits", () => {
  it("contains creator credits, copyright and the creator link", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toContain("Criado por Marcos Macêdo");
    expect(source).toContain("© 2026 Marcos Macêdo. Todos os direitos reservados.");
    expect(source).toContain("https://marcosmacedo.dev/");
    expect(source).toContain('rel="noopener noreferrer"');
  });

  it("guides users to paste the full match message", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toContain("Cole aqui a mensagem inteira da pelada");
    expect(source).toContain("valor, Pix, horário, local, regras e avisos");
    expect(source).toContain("PELADA_PLACEHOLDER");
  });

  it("offers a copyable list template near the input", () => {
    const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    expect(source).toContain("LIST_TEMPLATE");
    expect(source).toContain("Copiar modelo de lista");
    expect(source).toContain("Modelo copiado!");
    expect(source).toContain("VALOR: R$");
    expect(source).toContain("Futebol (INFORMAR DATA)");
    expect(source).toContain("LISTA ABERTA");
    expect(source).toContain("24-");
    expect(source).toContain("Regras do FUT");
  });

  it("references the custom favicon", () => {
    const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const favicon = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");

    expect(indexHtml).toContain('/favicon.svg');
    expect(favicon).toContain("<svg");
  });
});
