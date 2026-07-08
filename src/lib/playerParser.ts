const IRRELEVANT_PREFIXES = [
  /^(?:e\s+)?faixa\s+/iu,
  /^(?:confirmad[oa]|confirmou|confirmado|confirmada|confirm)\s+/iu,
  /^(?:pago|paga|pg|ok|feito|fechou|presen[çc]a)\s+/iu
];

const LOWERCASE_PARTICLES = new Set(["da", "de", "di", "do", "das", "dos", "e"]);

export function parsePlayerNames(input: string): string[] {
  const candidates = input
    .split(/\r?\n/u)
    .map(extractNameFromLine)
    .filter((name): name is string => Boolean(name));

  return differentiateDuplicates(candidates);
}

export function extractNameFromLine(line: string): string | null {
  const normalizedLine = line.normalize("NFC").trim();
  const match = normalizedLine.match(/^\s*\d{1,3}(?:(?:\s*[-.)]\s*)|\s+)(.*?)\s*$/u);

  if (!match) {
    return null;
  }

  const cleaned = cleanPlayerName(match[1]);
  return cleaned.length > 0 ? cleaned : null;
}

export function isNumberedListLine(line: string): boolean {
  return /^\s*\d{1,3}(?:\s*$|\s+.+$|\s*[-.)]\s*.*$)/u.test(line);
}

export function cleanPlayerName(rawName: string): string {
  let name = rawName
    .replace(/\s+/gu, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/[;,:-]+$/u, "")
    .trim();

  for (let index = 0; index < 4; index += 1) {
    const before = name;
    for (const prefix of IRRELEVANT_PREFIXES) {
      name = name.replace(prefix, "");
    }
    name = name.replace(/\s+/gu, " ").trim();
    if (name === before) {
      break;
    }
  }

  return friendlyCapitalize(name);
}

export function friendlyCapitalize(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word, index) => capitalizeWord(word, index))
    .join(" ");
}

export function differentiateDuplicates(names: string[]): string[] {
  const counts = new Map<string, number>();

  return names.map((name) => {
    const key = normalizeNameKey(name);
    const nextCount = (counts.get(key) ?? 0) + 1;
    counts.set(key, nextCount);

    return nextCount === 1 ? name : `${name} #${nextCount}`;
  });
}

export function normalizeNameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function capitalizeWord(word: string, index: number): string {
  if (/^[\p{Lu}\d]{1,4}\.?$/u.test(word)) {
    return word;
  }

  const lower = word.toLocaleLowerCase("pt-BR");
  if (index > 0 && LOWERCASE_PARTICLES.has(lower)) {
    return lower;
  }

  const firstLetterMatch = lower.match(/\p{L}/u);
  if (!firstLetterMatch || firstLetterMatch.index === undefined) {
    return word;
  }

  const firstLetterIndex = firstLetterMatch.index;
  return `${lower.slice(0, firstLetterIndex)}${lower
    .charAt(firstLetterIndex)
    .toLocaleUpperCase("pt-BR")}${lower.slice(firstLetterIndex + 1)}`;
}
