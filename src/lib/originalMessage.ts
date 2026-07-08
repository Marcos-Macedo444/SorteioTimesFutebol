import type { DrawResult } from "../types";
import { formatTeamsBlockForOriginalMessage } from "./formatResult";
import { extractNameFromLine } from "./playerParser";

export function generateFullMessageWithDraw(originalMessage: string, result: DrawResult): string {
  const lines = originalMessage.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const range = findOriginalPlayerListRange(lines);
  const replacementBlock = formatTeamsBlockForOriginalMessage(result).split("\n");

  if (!range) {
    return normalizeBlankLines([...trimTrailingEmpty(lines), "", ...replacementBlock].join("\n"));
  }

  const before = trimTrailingEmpty(lines.slice(0, range.start));
  const after = trimLeadingEmpty(lines.slice(range.end));

  return normalizeBlankLines([...before, "", ...replacementBlock, "", ...after].join("\n"));
}

export function findOriginalPlayerListRange(lines: string[]): { start: number; end: number } | null {
  const firstPlayerLineIndex = lines.findIndex((line) => extractNameFromLine(line) !== null);

  if (firstPlayerLineIndex === -1) {
    return null;
  }

  let start = firstPlayerLineIndex;
  const titleIndex = findImmediatePreviousContentLine(lines, firstPlayerLineIndex);

  if (titleIndex !== null && /^\s*lista\s+aberta\s*:?\s*$/iu.test(lines[titleIndex])) {
    start = titleIndex;
  }

  let end = firstPlayerLineIndex;
  while (end < lines.length) {
    const line = lines[end];

    if (line.trim() === "") {
      end += 1;
      continue;
    }

    if (isNumberedPlayerOrEmptyLine(line)) {
      end += 1;
      continue;
    }

    break;
  }

  if (end < lines.length && /^\s*suplentes\s*:?\s*$/iu.test(lines[end])) {
    end += 1;
    while (end < lines.length && lines[end].trim() === "") {
      end += 1;
    }
  }

  return { start, end };
}

function isNumberedPlayerOrEmptyLine(line: string): boolean {
  return /^\s*\d{1,3}(?:\s*$|\s+.+$|\s*[-.)]\s*.*$)/u.test(line);
}

function findImmediatePreviousContentLine(lines: string[], fromIndex: number): number | null {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    if (lines[index].trim() !== "") {
      return index;
    }
  }

  return null;
}

function trimTrailingEmpty(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1].trim() === "") {
    result.pop();
  }

  return result;
}

function trimLeadingEmpty(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[0].trim() === "") {
    result.shift();
  }

  return result;
}

function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
