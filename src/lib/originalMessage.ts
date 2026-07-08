import type { DrawResult } from "../types";
import { formatTeamsBlockForOriginalMessage } from "./formatResult";
import { findPlayerListBlock, isRulesOrWarningLine, isSupplementsMarkerLine } from "./playerParser";

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
  const listBlock = findPlayerListBlock(lines);

  if (!listBlock) {
    return null;
  }

  const start = listBlock.markerIndex ?? listBlock.firstPlayerIndex;
  let end = listBlock.endIndex;

  if (isEmptySupplementsSection(lines, end)) {
    end = skipSupplementsSection(lines, end);
  }

  return { start, end };
}

function isEmptySupplementsSection(lines: string[], supplementsIndex: number): boolean {
  if (supplementsIndex >= lines.length || !isSupplementsMarkerLine(lines[supplementsIndex])) {
    return false;
  }

  let nextContentIndex = supplementsIndex + 1;
  while (nextContentIndex < lines.length && lines[nextContentIndex].trim() === "") {
    nextContentIndex += 1;
  }

  return nextContentIndex >= lines.length || isRulesOrWarningLine(lines[nextContentIndex]);
}

function skipSupplementsSection(lines: string[], supplementsIndex: number): number {
  let end = supplementsIndex + 1;

  while (end < lines.length && lines[end].trim() === "") {
    end += 1;
  }

  return end;
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
