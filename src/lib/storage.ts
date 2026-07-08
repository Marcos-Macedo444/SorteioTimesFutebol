import type { AppState, DrawConfig, DrawHistoryEntry, Player, SkillRating } from "../types";
import { DEFAULT_DRAW_CONFIG } from "./drawAlgorithm";

const STORAGE_KEY = "sorteio-times-pelada:v1";

export function loadAppState(): AppState {
  if (typeof localStorage === "undefined") {
    return createDefaultState();
  }

  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return createDefaultState();
    }

    const parsed = JSON.parse(rawState) as Partial<AppState>;

    return {
      rawText: typeof parsed.rawText === "string" ? parsed.rawText : "",
      players: sanitizePlayers(parsed.players),
      config: sanitizeConfig(parsed.config),
      history: sanitizeHistory(parsed.history)
    };
  } catch {
    return createDefaultState();
  }
}

export function saveAppState(state: AppState): void {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearAppState(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function exportPlayersJson(players: Player[]): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      players: players.map((player) => ({
        name: player.name,
        skill: player.skill
      }))
    },
    null,
    2
  );
}

export function importPlayersJson(rawJson: string): Player[] {
  const parsed = JSON.parse(rawJson) as unknown;
  const rawPlayers = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && "players" in parsed
      ? (parsed as { players: unknown }).players
      : null;

  if (!Array.isArray(rawPlayers)) {
    throw new Error("JSON inválido. O arquivo precisa conter uma lista de jogadores.");
  }

  const players = sanitizePlayers(rawPlayers);
  if (players.length === 0) {
    throw new Error("Nenhum jogador válido foi encontrado no JSON.");
  }

  return players;
}

function createDefaultState(): AppState {
  return {
    rawText: "",
    players: [],
    config: DEFAULT_DRAW_CONFIG,
    history: []
  };
}

function sanitizePlayers(rawPlayers: unknown): Player[] {
  if (!Array.isArray(rawPlayers)) {
    return [];
  }

  return rawPlayers
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const maybePlayer = item as Partial<Player>;
      const name = typeof maybePlayer.name === "string" ? maybePlayer.name.trim() : "";
      if (!name) {
        return null;
      }

      return {
        id: typeof maybePlayer.id === "string" && maybePlayer.id ? maybePlayer.id : createId(),
        name,
        skill: sanitizeSkill(maybePlayer.skill)
      };
    })
    .filter((player): player is Player => player !== null);
}

function sanitizeConfig(rawConfig: unknown): DrawConfig {
  const base = DEFAULT_DRAW_CONFIG;

  if (typeof rawConfig !== "object" || rawConfig === null) {
    return base;
  }

  const maybeConfig = rawConfig as Partial<DrawConfig>;
  const teamCount = clampNumber(maybeConfig.teamCount, 2, 10, base.teamCount);
  const playersPerTeam = clampNumber(maybeConfig.playersPerTeam, 1, 30, base.playersPerTeam);
  const teamNames = Array.from({ length: teamCount }, (_, index) => {
    const name = maybeConfig.teamNames?.[index];
    return typeof name === "string" && name.trim() ? name.trim() : `Time ${index + 1}`;
  });

  return {
    teamCount,
    playersPerTeam,
    drawAllPlayers: Boolean(maybeConfig.drawAllPlayers),
    teamNames,
    attempts: clampNumber(maybeConfig.attempts, 100, 2000, base.attempts)
  };
}

function sanitizeHistory(rawHistory: unknown): DrawHistoryEntry[] {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  return rawHistory
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }

      const maybeEntry = entry as Partial<DrawHistoryEntry>;
      if (!Array.isArray(maybeEntry.pairs) || !Array.isArray(maybeEntry.teams)) {
        return null;
      }

      return {
        id: typeof maybeEntry.id === "string" ? maybeEntry.id : createId(),
        createdAt: typeof maybeEntry.createdAt === "string" ? maybeEntry.createdAt : new Date().toISOString(),
        players: Array.isArray(maybeEntry.players)
          ? maybeEntry.players.filter((name): name is string => typeof name === "string")
          : [],
        teams: maybeEntry.teams
          .filter((team) => typeof team === "object" && team !== null)
          .map((team) => ({
            name:
              typeof (team as { name?: unknown }).name === "string"
                ? ((team as { name: string }).name || "Time").trim()
                : "Time",
            players: Array.isArray((team as { players?: unknown }).players)
              ? ((team as { players: unknown[] }).players.filter(
                  (name): name is string => typeof name === "string"
                ) as string[])
              : []
          })),
        pairs: maybeEntry.pairs.filter((pair): pair is string => typeof pair === "string")
      };
    })
    .filter((entry): entry is DrawHistoryEntry => entry !== null)
    .slice(0, 20);
}

function sanitizeSkill(skill: unknown): SkillRating {
  return skill === 1 || skill === 2 || skill === 3 || skill === 4 || skill === 5 || skill === "unknown"
    ? skill
    : "unknown";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
