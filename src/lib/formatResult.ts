import type { AppliedSkill, DrawPlayer, DrawResult, SkillRating } from "../types";

export function formatSkillLabel(skill: SkillRating): string {
  if (skill === "unknown") {
    return "Não conheço · peso médio";
  }

  return formatStars(skill, "plain");
}

export function formatDrawForWhatsApp(result: Omit<DrawResult, "copiedText">): string {
  const lines = ["⚽ Sorteio da Pelada", ""];

  for (const team of result.teams) {
    lines.push(team.name);
    lines.push(...formatTeamPlayerLinesForWhatsApp(team.players, team.vacancyCount));
    lines.push("");
    lines.push(`Total: ${team.totalSkill} estrelas`);
    lines.push(`Média: ${team.averageSkill.toFixed(1)}`);
    lines.push("");
  }

  if (result.substitutes.length > 0) {
    lines.push("Suplentes:");
    for (const player of result.substitutes) {
      lines.push(`* ${formatPlayerForWhatsApp(player)}`);
    }
    lines.push("");
  }

  lines.push("Resumo:");
  lines.push(`${result.observation} Diferença de ${result.balance.totalRange.toFixed(0)} estrelas entre os times.`);

  return lines.join("\n").trim();
}

export function formatTeamsBlockForOriginalMessage(result: DrawResult): string {
  const lines = ["⚽ TIMES SORTEADOS", ""];

  for (const team of result.teams) {
    lines.push(team.name);
    lines.push(...formatTeamPlayerLinesForWhatsApp(team.players, team.vacancyCount));
    lines.push("");
  }

  if (result.substitutes.length > 0) {
    lines.push("Suplentes:");
    for (const player of result.substitutes) {
      lines.push(`* ${formatPlayerForWhatsApp(player)}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function formatTeamPlayerLinesForWhatsApp(players: DrawPlayer[], vacancyCount: number): string[] {
  return [
    ...players.map((player) => `* ${formatPlayerForWhatsApp(player)}`),
    ...Array.from({ length: vacancyCount }, () => "* *Vaga Sobrando*")
  ];
}

export function formatPlayerForWhatsApp(player: DrawPlayer): string {
  if (player.wasUnknown) {
    return `${player.name} — Não conheço`;
  }

  return `${player.name} ${formatStars(player.appliedSkill, "whatsapp")}`;
}

export function formatStars(skill: AppliedSkill, mode: "plain" | "whatsapp" = "plain"): string {
  const star = mode === "whatsapp" ? "⭐" : "★";
  return star.repeat(skill);
}
