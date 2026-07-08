import { describe, expect, it } from "vitest";
import type { DrawConfig, Player, SkillRating } from "../types";
import { createHistoryEntry, drawTeams } from "./drawAlgorithm";

const baseConfig: DrawConfig = {
  teamCount: 2,
  playersPerTeam: 4,
  drawAllPlayers: false,
  teamNames: ["Time 1", "Time 2"],
  attempts: 400
};

describe("drawAlgorithm", () => {
  it("keeps every selected player and balances basic team strength", () => {
    const result = drawTeams(
      [
        player("Theo", 5),
        player("Jayme", 5),
        player("Renan", 4),
        player("João", 4),
        player("Brunin", 2),
        player("JG", 2),
        player("Kaua", 1),
        player("Marquin", 1)
      ],
      baseConfig
    );

    expect(result.teams).toHaveLength(2);
    expect(result.teams.every((team) => team.players.length === 4)).toBe(true);
    expect(result.teams.flatMap((team) => team.players)).toHaveLength(8);
    expect(result.balance.totalRange).toBeLessThanOrEqual(2);
  });

  it("spreads unknown players across teams", () => {
    const result = drawTeams(
      [
        player("A", "unknown"),
        player("B", "unknown"),
        player("C", "unknown"),
        player("D", "unknown"),
        player("E", 5),
        player("F", 4),
        player("G", 2),
        player("H", 1)
      ],
      {
        teamCount: 4,
        playersPerTeam: 2,
        drawAllPlayers: false,
        teamNames: ["Time 1", "Time 2", "Time 3", "Time 4"],
        attempts: 500
      }
    );

    expect(result.teams).toHaveLength(4);
    expect(result.balance.unknownRange).toBeLessThanOrEqual(1);
    expect(
      result.teams
        .flatMap((team) => team.players)
        .filter((drawPlayer) => drawPlayer.wasUnknown)
        .every((drawPlayer) => drawPlayer.appliedSkill === 3)
    ).toBe(true);
    expect(result.copiedText).toContain("Não conheço");
    expect(result.copiedText).not.toContain("sorteado como");
  });

  it("separates extra players as substitutes when the fixed size does not use everyone", () => {
    const result = drawTeams(
      [
        player("A", 5),
        player("B", 4),
        player("C", 3),
        player("D", 2),
        player("E", 1)
      ],
      {
        teamCount: 2,
        playersPerTeam: 2,
        drawAllPlayers: false,
        teamNames: ["Time 1", "Time 2"],
        attempts: 200
      }
    );

    expect(result.teams.flatMap((team) => team.players)).toHaveLength(4);
    expect(result.substitutes).toHaveLength(1);
  });

  it("adds open slots when there are fewer players than configured vacancies", () => {
    const result = drawTeams(
      [player("A", 5), player("B", 4), player("C", 3), player("D", 2), player("E", 1)],
      {
        teamCount: 2,
        playersPerTeam: 3,
        drawAllPlayers: false,
        teamNames: ["Time 1", "Time 2"],
        attempts: 200
      }
    );

    expect(result.teams.reduce((sum, team) => sum + team.vacancyCount, 0)).toBe(1);
    expect(result.copiedText).toContain("*Vaga Sobrando*");
  });

  it("uses 24 configured slots for 4 teams with 6 players each", () => {
    const players = Array.from({ length: 20 }, (_, index) => player(`Jogador ${index + 1}`, 3));
    const result = drawTeams(players, {
      teamCount: 4,
      playersPerTeam: 6,
      drawAllPlayers: false,
      teamNames: ["Time 1", "Time 2", "Time 3", "Time 4"],
      attempts: 300
    });

    expect(result.teams).toHaveLength(4);
    expect(result.teams.every((team) => team.targetSize === 6)).toBe(true);
    expect(result.teams.reduce((sum, team) => sum + team.targetSize, 0)).toBe(24);
    expect(result.teams.reduce((sum, team) => sum + team.vacancyCount, 0)).toBe(4);
  });

  it("moves players above 24 configured slots to substitutes", () => {
    const players = Array.from({ length: 27 }, (_, index) => player(`Jogador ${index + 1}`, 3));
    const result = drawTeams(players, {
      teamCount: 4,
      playersPerTeam: 6,
      drawAllPlayers: false,
      teamNames: ["Time 1", "Time 2", "Time 3", "Time 4"],
      attempts: 300
    });

    expect(result.teams.flatMap((team) => team.players)).toHaveLength(24);
    expect(result.substitutes).toHaveLength(3);
  });

  it("stores pair history that can be reused in later draws", () => {
    const result = drawTeams(
      [
        player("A", 5),
        player("B", 4),
        player("C", 3),
        player("D", 2)
      ],
      {
        teamCount: 2,
        playersPerTeam: 2,
        drawAllPlayers: false,
        teamNames: ["Time 1", "Time 2"],
        attempts: 150
      }
    );

    const historyEntry = createHistoryEntry(result);

    expect(historyEntry.pairs).toHaveLength(2);
    expect(historyEntry.teams).toHaveLength(2);
  });
});

function player(name: string, skill: SkillRating): Player {
  return {
    id: name,
    name,
    skill
  };
}
