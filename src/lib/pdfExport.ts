import type { DrawPlayer, DrawResult } from "../types";
import { formatStars } from "./formatResult";

export function exportDrawAsPdf(result: DrawResult): void {
  const printWindow = window.open("", "_blank", "width=900,height=720");

  if (!printWindow) {
    throw new Error("Não foi possível abrir a janela de impressão.");
  }

  printWindow.document.open();
  printWindow.document.write(createPdfHtml(result));
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => {
    printWindow.print();
  }, 250);
}

function createPdfHtml(result: DrawResult): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Sorteio da Pelada</title>
    <style>
      @page { margin: 18mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #1d2820;
        font-family: Arial, Helvetica, sans-serif;
        background: #ffffff;
      }
      header {
        border-bottom: 3px solid #11764a;
        padding-bottom: 14px;
        margin-bottom: 18px;
      }
      h1 { margin: 0 0 6px; font-size: 28px; }
      h2 { margin: 0; font-size: 18px; }
      h3 { margin: 0; font-size: 16px; }
      .date { color: #5d6c60; }
      .summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin: 16px 0;
      }
      .summary div, .team {
        border: 1px solid #d7e2d4;
        border-radius: 8px;
        padding: 10px;
      }
      .summary strong { display: block; color: #11764a; font-size: 18px; }
      .teams {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .team h2 {
        background: #edf5ef;
        border-radius: 6px;
        padding: 9px;
        margin-bottom: 8px;
      }
      ul { list-style: none; padding: 0; margin: 0; }
      li {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        border-bottom: 1px solid #edf1ea;
        padding: 6px 0;
      }
      .unknown { color: #285b8f; font-weight: 700; }
      .vacancy { font-weight: 800; }
      .metrics {
        display: flex;
        gap: 10px;
        margin-top: 10px;
        color: #435248;
        font-size: 13px;
      }
      .substitutes {
        margin-top: 14px;
        border: 1px solid #d7e2d4;
        border-radius: 8px;
        padding: 12px;
      }
      footer {
        border-top: 1px solid #d7e2d4;
        color: #5d6c60;
        font-size: 12px;
        margin-top: 24px;
        padding-top: 12px;
      }
      a { color: #11764a; }
      @media print {
        .teams { break-inside: avoid; }
        .team { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Sorteio da Pelada</h1>
      <div class="date">${escapeHtml(formatDate(result.createdAt))}</div>
    </header>
    <section class="summary">
      <div><strong>${countPlayers(result)}</strong> jogadores</div>
      <div><strong>${countVacancies(result)}</strong> vagas sobrando</div>
      <div><strong>${result.substitutes.length}</strong> suplentes</div>
      <div><strong>${escapeHtml(result.balance.totalRange.toFixed(0))}</strong> diferença</div>
    </section>
    <p><strong>${escapeHtml(result.observation)}</strong></p>
    <main class="teams">
      ${result.teams.map(renderTeam).join("")}
    </main>
    ${renderSubstitutes(result)}
    <footer>
      <div>Criado por Marcos Macêdo</div>
      <div>© 2026 Marcos Macêdo. Todos os direitos reservados.</div>
      <div>Conheça o criador: <a href="https://marcosmacedo.dev/">https://marcosmacedo.dev/</a></div>
    </footer>
  </body>
</html>`;
}

function renderTeam(team: DrawResult["teams"][number]): string {
  return `<article class="team">
    <h2>${escapeHtml(team.name)}</h2>
    <ul>
      ${team.players.map(renderPlayer).join("")}
      ${Array.from({ length: team.vacancyCount }, () => '<li class="vacancy">Vaga Sobrando</li>').join("")}
    </ul>
    <div class="metrics">
      <span>Total: ${team.totalSkill}</span>
      <span>Média: ${team.averageSkill.toFixed(1)}</span>
      <span>Não conheço: ${team.unknownCount}</span>
    </div>
  </article>`;
}

function renderPlayer(player: DrawPlayer): string {
  const label = player.wasUnknown
    ? '<span class="unknown">Não conheço</span>'
    : `<span>${formatStars(player.appliedSkill, "whatsapp")}</span>`;

  return `<li><span>${escapeHtml(player.name)}</span>${label}</li>`;
}

function renderSubstitutes(result: DrawResult): string {
  if (result.substitutes.length === 0) {
    return "";
  }

  return `<section class="substitutes">
    <h2>Suplentes</h2>
    <ul>${result.substitutes.map(renderPlayer).join("")}</ul>
  </section>`;
}

function countPlayers(result: DrawResult): number {
  return result.teams.reduce((sum, team) => sum + team.players.length, 0);
}

function countVacancies(result: DrawResult): number {
  return result.teams.reduce((sum, team) => sum + team.vacancyCount, 0);
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(isoDate));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
