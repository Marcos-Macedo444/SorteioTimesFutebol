import { describe, expect, it } from "vitest";
import { cleanNumericDraft, commitNumericDraft, isInNumericRange, readNumericDraft } from "./numericInput";

describe("numericInput", () => {
  it("lets the user type 6 without changing it to another value", () => {
    const draft = cleanNumericDraft("6");

    expect(draft).toBe("6");
    expect(readNumericDraft(draft)).toBe(6);
    expect(isInNumericRange(6, { min: 1, max: 30 })).toBe(true);
  });

  it("commits values only on blur with safe clamping", () => {
    expect(commitNumericDraft("", { min: 1, max: 30, fallback: 5 })).toBe(5);
    expect(commitNumericDraft("31", { min: 1, max: 30, fallback: 5 })).toBe(30);
    expect(commitNumericDraft("06", { min: 1, max: 30, fallback: 5 })).toBe(6);
  });

  it("filters mobile numeric keyboard drafts without aggressive auto-adjusting", () => {
    expect(cleanNumericDraft("6 jogadores")).toBe("6");
    expect(cleanNumericDraft("15")).toBe("15");
  });
});
