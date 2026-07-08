export type SkillRating = 1 | 2 | 3 | 4 | 5 | "unknown";

export interface Player {
  id: string;
  name: string;
  skill: SkillRating;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  totalSkill: number;
  averageSkill: number;
  unknownCount: number;
  strongCount: number;
  weakCount: number;
}

export interface DrawConfig {
  teamCount: number;
  playersPerTeam: number;
  drawAllPlayers: boolean;
  teamNames: string[];
  attempts: number;
}

export interface BalanceSummary {
  totalRange: number;
  averageRange: number;
  unknownRange: number;
  playerCountRange: number;
  historyPenalty: number;
  score: number;
}

export interface DrawResult {
  id: string;
  createdAt: string;
  teams: Team[];
  substitutes: Player[];
  balance: BalanceSummary;
  observation: string;
  copiedText: string;
}

export interface StoredTeamSnapshot {
  name: string;
  players: string[];
}

export interface DrawHistoryEntry {
  id: string;
  createdAt: string;
  players: string[];
  teams: StoredTeamSnapshot[];
  pairs: string[];
}

export interface AppState {
  rawText: string;
  players: Player[];
  config: DrawConfig;
  history: DrawHistoryEntry[];
}
