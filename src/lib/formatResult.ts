import type { DrawResult, SkillRating } from "../types";

export function formatSkillLabel(skill: SkillRating): string {
  return skill === "unknown" ? "Não conheço" : "★".repeat(skill);
}

export function formatDrawForWhatsApp(result: Omit<DrawResult, "copiedText">): string {
  const lines = ["⚽ Sorteio da Pelada", ""];

  for (const team of result.teams) {
    lines.push(team.name);
    for (const player of team.players) {
      lines.push(`* ${player.name} ${formatSkillForWhatsApp(player.skill)}`);
    }
    lines.push(`Total: ${team.totalSkill} estrelas`);
    lines.push(`Média: ${team.averageSkill.toFixed(1)}`);
    lines.push("");
  }

  if (result.substitutes.length > 0) {
    lines.push("Suplentes");
    for (const player of result.substitutes) {
      lines.push(`* ${player.name} ${formatSkillForWhatsApp(player.skill)}`);
    }
    lines.push("");
  }

  lines.push("Observação:");
  lines.push(`${result.observation} Diferença de ${result.balance.totalRange.toFixed(0)} estrelas entre os times.`);

  return lines.join("\n").trim();
}

export function formatSkillForWhatsApp(skill: SkillRating): string {
  if (skill === "unknown") {
    return "Não conheço";
  }

  return "⭐".repeat(skill);
}
