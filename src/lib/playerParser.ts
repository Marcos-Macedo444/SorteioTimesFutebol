const IRRELEVANT_PREFIXES = [
  /^(?:e\s+)?faixa\s+/iu,
  /^(?:confirmad[oa]|confirmou|confirmado|confirmada|confirm)\s+/iu,
  /^(?:pago|paga|pg|ok|feito|fechou|presen[çc]a)\s+/iu
];

const LOWERCASE_PARTICLES = new Set(["da", "de", "di", "do", "das", "dos", "e"]);

export interface PlayerListBlock {
  markerIndex: number | null;
  firstPlayerIndex: number;
  endIndex: number;
}

export function parsePlayerNames(input: string): string[] {
  const lines = input.split(/\r?\n/u);
  const listBlock = findPlayerListBlock(lines);
  const sourceLines = listBlock ? lines.slice(listBlock.firstPlayerIndex, listBlock.endIndex) : [];
  const candidates = sourceLines
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

export function isListMarkerLine(line: string): boolean {
  return /^\s*(?:lista(?:\s+aberta)?|jogadores|confirmados)\s*:?\s*$/iu.test(line);
}

export function isSupplementsMarkerLine(line: string): boolean {
  return /^\s*suplentes\s*:?\s*$/iu.test(line);
}

export function isRulesOrWarningLine(line: string): boolean {
  return /^\s*(?:⚠|🚨|regras\b|avisos?\b)/iu.test(line);
}

export function findPlayerListBlock(lines: string[]): PlayerListBlock | null {
  const markerIndex = lines.findIndex(isListMarkerLine);

  if (markerIndex !== -1) {
    const firstPlayerIndex = findNextPlayerLineIndex(lines, markerIndex + 1);
    return firstPlayerIndex === null ? null : buildListBlock(lines, markerIndex, firstPlayerIndex);
  }

  const firstSequentialPlayerIndex = findSequentialPlayerLineIndex(lines);
  return firstSequentialPlayerIndex === null ? null : buildListBlock(lines, null, firstSequentialPlayerIndex);
}

function buildListBlock(lines: string[], markerIndex: number | null, firstPlayerIndex: number): PlayerListBlock {
  return {
    markerIndex,
    firstPlayerIndex,
    endIndex: findNumberedListEndIndex(lines, firstPlayerIndex)
  };
}

function findNextPlayerLineIndex(lines: string[], startIndex: number): number | null {
  for (let index = startIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim() === "") {
      continue;
    }

    if (isSupplementsMarkerLine(line) || isRulesOrWarningLine(line)) {
      return null;
    }

    if (extractNameFromLine(line) !== null) {
      return index;
    }
  }

  return null;
}

function findSequentialPlayerLineIndex(lines: string[]): number | null {
  for (let index = 0; index < lines.length; index += 1) {
    const number = getNumberedLineIndex(lines[index]);

    if (number !== 1 || extractNameFromLine(lines[index]) === null) {
      continue;
    }

    if (hasFollowingPlayerLine(lines, index + 1)) {
      return index;
    }
  }

  return null;
}

function hasFollowingPlayerLine(lines: string[], startIndex: number): boolean {
  for (let index = startIndex; index < Math.min(lines.length, startIndex + 8); index += 1) {
    const line = lines[index];

    if (line.trim() === "") {
      continue;
    }

    if (isSupplementsMarkerLine(line) || isRulesOrWarningLine(line)) {
      return false;
    }

    const number = getNumberedLineIndex(line);
    if (number !== null && number > 1 && extractNameFromLine(line) !== null) {
      return true;
    }

    if (!isNumberedListLine(line)) {
      return false;
    }
  }

  return false;
}

function findNumberedListEndIndex(lines: string[], firstPlayerIndex: number): number {
  let endIndex = firstPlayerIndex;

  while (endIndex < lines.length) {
    const line = lines[endIndex];

    if (line.trim() === "") {
      endIndex += 1;
      continue;
    }

    if (isSupplementsMarkerLine(line) || isRulesOrWarningLine(line)) {
      break;
    }

    if (isNumberedListLine(line)) {
      endIndex += 1;
      continue;
    }

    break;
  }

  return endIndex;
}

function getNumberedLineIndex(line: string): number | null {
  const match = line.match(/^\s*(\d{1,3})(?:(?:\s*[-.)]\s*)|\s+)/u);
  return match ? Number(match[1]) : null;
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
