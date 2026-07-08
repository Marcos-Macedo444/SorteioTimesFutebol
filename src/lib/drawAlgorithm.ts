import type {
  AppliedSkill,
  BalanceSummary,
  DrawConfig,
  DrawHistoryEntry,
  DrawPlayer,
  DrawResult,
  Player,
  SkillRating,
  Team
} from "../types";
import { formatDrawForWhatsApp } from "./formatResult";
import { normalizeNameKey } from "./playerParser";

interface WorkingTeam {
  id: string;
  name: string;
  players: DrawPlayer[];
  targetSize: number;
}

interface Candidate {
  teams: Team[];
  substitutes: DrawPlayer[];
  balance: BalanceSummary;
}

export const DEFAULT_DRAW_CONFIG: DrawConfig = {
  teamCount: 4,
  playersPerTeam: 5,
  drawAllPlayers: false,
  teamNames: ["Time 1", "Time 2", "Time 3", "Time 4"],
  attempts: 900
};

export function drawTeams(
  players: Player[],
  config: DrawConfig,
  history: DrawHistoryEntry[] = []
): DrawResult {
  const cleanPlayers = players
    .map((player) => ({
      ...player,
      name: player.name.trim()
    }))
    .filter((player) => player.name.length > 0);

  validateDrawInput(cleanPlayers, config);

  const attempts = Math.max(100, Math.min(config.attempts || DEFAULT_DRAW_CONFIG.attempts, 2000));
  const pairPenalties = buildPairPenaltyMap(history);
  let bestCandidate: Candidate | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const random = createSeededRandom(Date.now() + attempt * 7919 + Math.floor(Math.random() * 1_000_000));
    const candidate = buildCandidate(cleanPlayers, config, pairPenalties, random);

    if (!bestCandidate || candidate.balance.score < bestCandidate.balance.score) {
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate) {
    throw new Error("Não foi possível gerar o sorteio.");
  }

  const resultWithoutText = {
    id: createId(),
    createdAt: new Date().toISOString(),
    teams: bestCandidate.teams,
    substitutes: bestCandidate.substitutes,
    balance: bestCandidate.balance,
    observation: createObservation(bestCandidate.balance, cleanPlayers),
    copiedText: ""
  };

  const copiedText = formatDrawForWhatsApp(resultWithoutText);

  return {
    ...resultWithoutText,
    copiedText
  };
}

export function skillWeight(skill: SkillRating, appliedSkill?: AppliedSkill): number {
  return skill === "unknown" ? appliedSkill ?? 3 : skill;
}

export function createHistoryEntry(result: DrawResult): DrawHistoryEntry {
  const teams = result.teams.map((team) => ({
    name: team.name,
    players: team.players.map((player) => player.name)
  }));
  const pairs = result.teams.flatMap((team) => createPairs(team.players.map((player) => player.name)));

  return {
    id: result.id,
    createdAt: result.createdAt,
    players: result.teams.flatMap((team) => team.players.map((player) => player.name)),
    teams,
    pairs
  };
}

export function createPairs(names: string[]): string[] {
  const pairs: string[] = [];

  for (let first = 0; first < names.length; first += 1) {
    for (let second = first + 1; second < names.length; second += 1) {
      pairs.push(createPairKey(names[first], names[second]));
    }
  }

  return pairs;
}

export function createPairKey(firstName: string, secondName: string): string {
  return [normalizeNameKey(firstName), normalizeNameKey(secondName)].sort().join("::");
}

function buildCandidate(
  players: Player[],
  config: DrawConfig,
  pairPenalties: Map<string, number>,
  random: () => number
): Candidate {
  const shuffledPlayers = shuffle(players, random);
  const activeCount = config.drawAllPlayers
    ? players.length
    : Math.min(players.length, config.teamCount * config.playersPerTeam);
  const activePlayers = applyDrawSkills(shuffledPlayers.slice(0, activeCount), random);
  const substitutes = applyDrawSkills(shuffledPlayers.slice(activeCount), random);
  const targetSizes = getTargetSizes(activePlayers.length, config);
  const teams = createWorkingTeams(config, targetSizes);
  const orderedPlayers = orderPlayersForDistribution(activePlayers, random);

  for (const player of orderedPlayers) {
    const targetTeam = pickBestTeamForPlayer(player, teams, pairPenalties, random);
    targetTeam.players.push(player);
  }

  const hydratedTeams = teams.map(toTeam);
  const balance = scoreTeams(hydratedTeams, pairPenalties);

  return {
    teams: hydratedTeams,
    substitutes,
    balance
  };
}

function validateDrawInput(players: Player[], config: DrawConfig): void {
  if (players.length === 0) {
    throw new Error("Adicione pelo menos um jogador antes de sortear.");
  }

  if (config.teamCount < 2) {
    throw new Error("Use pelo menos 2 times.");
  }

  if (config.playersPerTeam < 1) {
    throw new Error("A quantidade de jogadores por time deve ser maior que zero.");
  }
}

function getTargetSizes(activeCount: number, config: DrawConfig): number[] {
  if (!config.drawAllPlayers) {
    return Array.from({ length: config.teamCount }, () => config.playersPerTeam);
  }

  const baseSize = Math.floor(activeCount / config.teamCount);
  const remainder = activeCount % config.teamCount;

  return Array.from({ length: config.teamCount }, (_, index) => baseSize + (index < remainder ? 1 : 0));
}

function createWorkingTeams(config: DrawConfig, targetSizes: number[]): WorkingTeam[] {
  return Array.from({ length: config.teamCount }, (_, index) => ({
    id: `team-${index + 1}`,
    name: config.teamNames[index]?.trim() || `Time ${index + 1}`,
    players: [],
    targetSize: targetSizes[index] ?? config.playersPerTeam
  }));
}

function applyDrawSkills(players: Player[], random: () => number): DrawPlayer[] {
  const knownPlayers = players.filter((player) => player.skill !== "unknown");
  const knownAverage =
    knownPlayers.length > 0
      ? knownPlayers.reduce((sum, player) => sum + skillWeight(player.skill), 0) / knownPlayers.length
      : 3;
  const strongRatio = knownPlayers.filter((player) => skillWeight(player.skill) >= 4).length / Math.max(1, knownPlayers.length);
  const weakRatio = knownPlayers.filter((player) => skillWeight(player.skill) <= 2).length / Math.max(1, knownPlayers.length);
  const unknownRatingCounts = new Map<AppliedSkill, number>();

  return players.map((player) => {
    if (player.skill !== "unknown") {
      return {
        ...player,
        appliedSkill: player.skill,
        wasUnknown: false
      };
    }

    const appliedSkill = chooseUnknownSkill({
      knownAverage,
      strongRatio,
      weakRatio,
      unknownRatingCounts,
      random
    });

    unknownRatingCounts.set(appliedSkill, (unknownRatingCounts.get(appliedSkill) ?? 0) + 1);

    return {
      ...player,
      appliedSkill,
      wasUnknown: true
    };
  });
}

function chooseUnknownSkill({
  knownAverage,
  strongRatio,
  weakRatio,
  unknownRatingCounts,
  random
}: {
  knownAverage: number;
  strongRatio: number;
  weakRatio: number;
  unknownRatingCounts: Map<AppliedSkill, number>;
  random: () => number;
}): AppliedSkill {
  const ratings: AppliedSkill[] = [1, 2, 3, 4, 5];

  return ratings.reduce((bestRating, rating) => {
    const distanceFromKnownAverage = Math.abs(rating - knownAverage);
    let score = 2.2 - distanceFromKnownAverage * 0.55;

    if (strongRatio > 0.4 && rating >= 4) {
      score -= 0.5 + strongRatio * 0.5;
    }

    if (weakRatio > 0.4 && rating <= 2) {
      score -= 0.5 + weakRatio * 0.5;
    }

    if (rating === 1 || rating === 5) {
      score -= 0.25;
    }

    score -= (unknownRatingCounts.get(rating) ?? 0) * 0.65;
    score += random() * 0.8;

    const bestScore = getUnknownSkillScore(bestRating, knownAverage, strongRatio, weakRatio, unknownRatingCounts);
    return score > bestScore ? rating : bestRating;
  }, 3 as AppliedSkill);
}

function getUnknownSkillScore(
  rating: AppliedSkill,
  knownAverage: number,
  strongRatio: number,
  weakRatio: number,
  unknownRatingCounts: Map<AppliedSkill, number>
): number {
  let score = 2.2 - Math.abs(rating - knownAverage) * 0.55;

  if (strongRatio > 0.4 && rating >= 4) {
    score -= 0.5 + strongRatio * 0.5;
  }

  if (weakRatio > 0.4 && rating <= 2) {
    score -= 0.5 + weakRatio * 0.5;
  }

  if (rating === 1 || rating === 5) {
    score -= 0.25;
  }

  return score - (unknownRatingCounts.get(rating) ?? 0) * 0.65;
}

function orderPlayersForDistribution(players: DrawPlayer[], random: () => number): DrawPlayer[] {
  return players
    .map((player) => ({
      player,
      score: player.appliedSkill * 100 + (player.wasUnknown ? 12 : 0) + random() * 25
    }))
    .sort((first, second) => second.score - first.score)
    .map((item) => item.player);
}

function pickBestTeamForPlayer(
  player: DrawPlayer,
  teams: WorkingTeam[],
  pairPenalties: Map<string, number>,
  random: () => number
): WorkingTeam {
  let availableTeams = teams.filter((team) => team.players.length < team.targetSize);

  if (availableTeams.length === 0) {
    availableTeams = teams;
  }

  if (player.wasUnknown) {
    const lowestUnknownCount = Math.min(...availableTeams.map((team) => countUnknown(team.players)));
    availableTeams = availableTeams.filter((team) => countUnknown(team.players) === lowestUnknownCount);
  }

  return availableTeams.reduce((bestTeam, team) => {
    const bestScore = scorePlacement(player, bestTeam, pairPenalties, random);
    const nextScore = scorePlacement(player, team, pairPenalties, random);
    return nextScore < bestScore ? team : bestTeam;
  }, availableTeams[0]);
}

function scorePlacement(
  player: DrawPlayer,
  team: WorkingTeam,
  pairPenalties: Map<string, number>,
  random: () => number
): number {
  const currentTotal = team.players.reduce((sum, teammate) => sum + teammate.appliedSkill, 0);
  const unknownPenalty = player.wasUnknown ? countUnknown(team.players) * 7 : 0;
  const strongPenalty = player.appliedSkill >= 4 ? countStrong(team.players) * 2 : 0;
  const weakPenalty = player.appliedSkill <= 2 ? countWeak(team.players) * 2 : 0;
  const historyPenalty = team.players.reduce(
    (sum, teammate) => sum + (pairPenalties.get(createPairKey(player.name, teammate.name)) ?? 0),
    0
  );

  return (
    currentTotal * 4 +
    team.players.length * 3 +
    unknownPenalty +
    strongPenalty +
    weakPenalty +
    historyPenalty * 5 +
    random() * 0.25
  );
}

function toTeam(team: WorkingTeam): Team {
  const totalSkill = team.players.reduce((sum, player) => sum + player.appliedSkill, 0);
  const playerCount = team.players.length;

  return {
    id: team.id,
    name: team.name,
    players: team.players,
    targetSize: team.targetSize,
    vacancyCount: Math.max(0, team.targetSize - playerCount),
    totalSkill,
    averageSkill: playerCount > 0 ? totalSkill / playerCount : 0,
    unknownCount: countUnknown(team.players),
    strongCount: countStrong(team.players),
    weakCount: countWeak(team.players)
  };
}

function scoreTeams(teams: Team[], pairPenalties: Map<string, number>): BalanceSummary {
  const totals = teams.map((team) => team.totalSkill);
  const averages = teams.map((team) => team.averageSkill);
  const unknowns = teams.map((team) => team.unknownCount);
  const counts = teams.map((team) => team.players.length);
  const vacancies = teams.map((team) => team.vacancyCount);
  const strongCounts = teams.map((team) => team.strongCount);
  const weakCounts = teams.map((team) => team.weakCount);
  const historyPenalty = teams.reduce(
    (sum, team) =>
      sum +
      createPairs(team.players.map((player) => player.name)).reduce(
        (pairSum, pair) => pairSum + (pairPenalties.get(pair) ?? 0),
        0
      ),
    0
  );
  const totalRange = range(totals);
  const averageRange = range(averages);
  const unknownRange = range(unknowns);
  const playerCountRange = range(counts);
  const vacancyRange = range(vacancies);
  const strongRange = range(strongCounts);
  const weakRange = range(weakCounts);
  const score =
    totalRange * 14 +
    averageRange * 10 +
    unknownRange * 8 +
    playerCountRange * 18 +
    vacancyRange * 10 +
    strongRange * 5 +
    weakRange * 4 +
    historyPenalty * 3;

  return {
    totalRange,
    averageRange,
    unknownRange,
    playerCountRange,
    vacancyRange,
    historyPenalty,
    score
  };
}

function buildPairPenaltyMap(history: DrawHistoryEntry[]): Map<string, number> {
  const penalties = new Map<string, number>();
  const recentHistory = history.slice(0, 20);

  recentHistory.forEach((entry, index) => {
    const recencyWeight = 1 + (recentHistory.length - index) / recentHistory.length;
    for (const pair of entry.pairs) {
      penalties.set(pair, (penalties.get(pair) ?? 0) + recencyWeight);
    }
  });

  return penalties;
}

function createObservation(balance: BalanceSummary, players: Player[]): string {
  const unknownRatio = players.filter((player) => player.skill === "unknown").length / players.length;

  if (balance.totalRange <= 1 && balance.unknownRange <= 1 && balance.vacancyRange <= 1) {
    return "Sorteio muito equilibrado.";
  }

  if (balance.totalRange <= 3 && balance.unknownRange <= 1) {
    return unknownRatio >= 0.35
      ? "Sorteio equilibrado, com atenção aos jogadores desconhecidos."
      : "Sorteio equilibrado.";
  }

  if (balance.totalRange <= 5) {
    return "Sorteio aceitável.";
  }

  return "Atenção: diferença alta entre os times.";
}

function countUnknown(players: DrawPlayer[]): number {
  return players.filter((player) => player.wasUnknown).length;
}

function countStrong(players: DrawPlayer[]): number {
  return players.filter((player) => player.appliedSkill >= 4).length;
}

function countWeak(players: DrawPlayer[]): number {
  return players.filter((player) => player.appliedSkill <= 2).length;
}

function range(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

function createSeededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
