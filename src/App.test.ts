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
});
