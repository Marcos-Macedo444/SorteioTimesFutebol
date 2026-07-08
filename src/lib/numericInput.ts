export interface NumericRange {
  min: number;
  max: number;
  fallback: number;
}

export function cleanNumericDraft(value: string, maxLength = 2): string {
  return value.replace(/\D/gu, "").slice(0, maxLength);
}

export function readNumericDraft(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function commitNumericDraft(value: string, range: NumericRange): number {
  const parsed = readNumericDraft(cleanNumericDraft(value));

  if (parsed === null) {
    return range.fallback;
  }

  return Math.min(range.max, Math.max(range.min, parsed));
}

export function isInNumericRange(value: number, range: Pick<NumericRange, "min" | "max">): boolean {
  return value >= range.min && value <= range.max;
}
