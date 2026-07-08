import {
  Clipboard,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  X
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { DrawConfig, DrawResult, Player, SkillRating } from "./types";
import { createHistoryEntry, DEFAULT_DRAW_CONFIG, drawTeams } from "./lib/drawAlgorithm";
import { formatSkillLabel } from "./lib/formatResult";
import { generateFullMessageWithDraw } from "./lib/originalMessage";
import { exportDrawAsPdf } from "./lib/pdfExport";
import { normalizeNameKey, parsePlayerNames } from "./lib/playerParser";
import {
  clearAppState,
  exportPlayersJson,
  importPlayersJson,
  loadAppState,
  saveAppState
} from "./lib/storage";

const skillOptions: Array<{ value: SkillRating; label: string }> = [
  { value: "unknown", label: "Não conheço" },
  { value: 1, label: "1 estrela - muito fraco" },
  { value: 2, label: "2 estrelas - abaixo da média" },
  { value: 3, label: "3 estrelas - médio" },
  { value: 4, label: "4 estrelas - bom" },
  { value: 5, label: "5 estrelas - muito bom" }
];

function App() {
  const initialState = useMemo(() => loadAppState(), []);
  const [rawText, setRawText] = useState(initialState.rawText);
  const [players, setPlayers] = useState<Player[]>(initialState.players);
  const [config, setConfig] = useState<DrawConfig>(initialState.config);
  const [history, setHistory] = useState(initialState.history);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("Pronto para sortear.");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [fullMessageCopyState, setFullMessageCopyState] = useState<"idle" | "copied" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveAppState({ rawText, players, config, history });
  }, [rawText, players, config, history]);

  const validPlayers = players.filter((player) => player.name.trim().length > 0);
  const activeCapacity = config.drawAllPlayers ? validPlayers.length : config.teamCount * config.playersPerTeam;
  const estimatedSubstitutes = Math.max(0, validPlayers.length - activeCapacity);
  const estimatedVacancies = config.drawAllPlayers ? 0 : Math.max(0, activeCapacity - validPlayers.length);

  function handleExtractNames() {
    const names = parsePlayerNames(rawText);

    if (names.length === 0) {
      setStatusMessage("Nenhum jogador numerado foi encontrado.");
      return;
    }

    const previousSkills = new Map(players.map((player) => [normalizeNameKey(player.name), player.skill]));
    const nextPlayers = names.map((name) => ({
      id: createId(),
      name,
      skill: previousSkills.get(normalizeNameKey(name)) ?? "unknown"
    }));

    setPlayers(nextPlayers);
    setResult(null);
    setStatusMessage(`${nextPlayers.length} jogadores extraídos.`);
  }

  function handleAddPlayer() {
    setPlayers((currentPlayers) => [
      ...currentPlayers,
      {
        id: createId(),
        name: "",
        skill: "unknown"
      }
    ]);
    setStatusMessage("Jogador manual adicionado.");
  }

  function handleUpdatePlayer(id: string, patch: Partial<Player>) {
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => (player.id === id ? { ...player, ...patch } : player))
    );
  }

  function handleRemovePlayer(id: string) {
    setPlayers((currentPlayers) => currentPlayers.filter((player) => player.id !== id));
    setResult(null);
  }

  function handleTeamCountChange(value: number) {
    const teamCount = clampNumber(value, 2, 10);

    setConfig((currentConfig) => ({
      ...currentConfig,
      teamCount,
      teamNames: Array.from(
        { length: teamCount },
        (_, index) => currentConfig.teamNames[index] || `Time ${index + 1}`
      )
    }));
  }

  function handleTeamNameChange(index: number, name: string) {
    setConfig((currentConfig) => ({
      ...currentConfig,
      teamNames: currentConfig.teamNames.map((teamName, teamIndex) => (teamIndex === index ? name : teamName))
    }));
  }

  function handleDraw() {
    try {
      const nextResult = drawTeams(validPlayers, config, history);
      setResult(nextResult);
      setHistory((currentHistory) => [createHistoryEntry(nextResult), ...currentHistory].slice(0, 20));
      setCopyState("idle");
      setFullMessageCopyState("idle");
      setStatusMessage("Sorteio gerado com equilíbrio.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Não foi possível sortear.");
    }
  }

  async function handleCopyResult() {
    if (!result) {
      return;
    }

    try {
      await copyText(result.copiedText);
      setCopyState("copied");
      setStatusMessage("Resultado copiado para WhatsApp.");
    } catch {
      setCopyState("error");
      setStatusMessage("Não foi possível copiar automaticamente.");
    }
  }

  async function handleCopyFullMessage() {
    if (!result) {
      return;
    }

    try {
      await copyText(generateFullMessageWithDraw(rawText, result));
      setFullMessageCopyState("copied");
      setStatusMessage("Mensagem completa copiada com os times sorteados.");
    } catch {
      setFullMessageCopyState("error");
      setStatusMessage("Não foi possível copiar a mensagem completa automaticamente.");
    }
  }

  function handleExportPdf() {
    if (!result) {
      return;
    }

    try {
      exportDrawAsPdf(result);
      setStatusMessage("PDF aberto na janela de impressão.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Não foi possível exportar o PDF.");
    }
  }

  function handleExportPlayers() {
    const blob = new Blob([exportPlayersJson(players)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "jogadores-pelada.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportPlayers(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedPlayers = importPlayersJson(await file.text());
      setPlayers(importedPlayers);
      setResult(null);
      setStatusMessage(`${importedPlayers.length} jogadores importados.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Não foi possível importar o JSON.");
    } finally {
      event.target.value = "";
    }
  }

  function handleClearAll() {
    clearAppState();
    setRawText("");
    setPlayers([]);
    setConfig(DEFAULT_DRAW_CONFIG);
    setHistory([]);
    setResult(null);
    setCopyState("idle");
    setFullMessageCopyState("idle");
    setStatusMessage("Dados salvos limpos.");
  }

  function handleClearHistory() {
    setHistory([]);
    setStatusMessage("Histórico local limpo.");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <img className="brand-mark" src="/field-mark.svg" alt="" aria-hidden="true" />
          <div>
            <h1>Sorteador de Times da Pelada</h1>
            <p>Extrai só os nomes, ignora o resto da mensagem e monta times equilibrados.</p>
          </div>
        </div>
        <div className="summary-strip" aria-label="Resumo atual">
          <span>{validPlayers.length} jogadores</span>
          <span>{history.length} sorteios no histórico</span>
        </div>
      </header>

      <main className="main-grid">
        <div className="primary-flow">
          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Entrada</span>
                <h2>Lista completa</h2>
              </div>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={handleClearAll}>
                  <Trash2 aria-hidden="true" size={18} />
                  Limpar dados salvos
                </button>
              </div>
            </div>
            <p className="helper-text">
              Cole a mensagem inteira da pelada. O sistema separa somente as linhas numeradas com jogadores.
            </p>
            <textarea
              className="raw-input"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Cole aqui a mensagem da pelada."
              spellCheck={false}
            />
            <div className="button-row">
              <button className="primary-button" type="button" onClick={handleExtractNames}>
                <Sparkles aria-hidden="true" size={18} />
                Extrair nomes
              </button>
              <button className="ghost-button" type="button" onClick={() => setRawText("")}>
                <X aria-hidden="true" size={18} />
                Limpar texto
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Jogadores</span>
                <h2>Nomes e habilidades</h2>
              </div>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={handleAddPlayer}>
                  <UserPlus aria-hidden="true" size={18} />
                  Adicionar
                </button>
                <button className="secondary-button" type="button" onClick={handleExportPlayers} disabled={!players.length}>
                  <Download aria-hidden="true" size={18} />
                  Exportar JSON
                </button>
                <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()}>
                  <Upload aria-hidden="true" size={18} />
                  Importar JSON
                </button>
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="application/json"
                  onChange={handleImportPlayers}
                />
              </div>
            </div>

            <div className="player-list">
              {players.length === 0 ? (
                <div className="empty-state">Nenhum jogador extraído ainda.</div>
              ) : (
                players.map((player, index) => (
                  <div className="player-row" key={player.id}>
                    <span className="player-index">{index + 1}</span>
                    <input
                      value={player.name}
                      onChange={(event) => handleUpdatePlayer(player.id, { name: event.target.value })}
                      aria-label={`Nome do jogador ${index + 1}`}
                    />
                    <select
                      value={String(player.skill)}
                      onChange={(event) =>
                        handleUpdatePlayer(player.id, { skill: parseSkillValue(event.target.value) })
                      }
                      aria-label={`Habilidade de ${player.name || `jogador ${index + 1}`}`}
                    >
                      {skillOptions.map((option) => (
                        <option key={option.value} value={String(option.value)}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => handleRemovePlayer(player.id)}
                      aria-label={`Remover ${player.name || `jogador ${index + 1}`}`}
                      title="Remover jogador"
                    >
                      <Trash2 aria-hidden="true" size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="side-flow">
          <section className="panel">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Sorteio</span>
                <h2>Configuração</h2>
              </div>
            </div>

            <div className="config-grid">
              <label>
                Quantidade de times
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={config.teamCount}
                  onChange={(event) => handleTeamCountChange(Number(event.target.value))}
                />
              </label>
              <label>
                Jogadores por time
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={config.playersPerTeam}
                  disabled={config.drawAllPlayers}
                  onChange={(event) =>
                    setConfig((currentConfig) => ({
                      ...currentConfig,
                      playersPerTeam: clampNumber(Number(event.target.value), 1, 15)
                    }))
                  }
                />
              </label>
            </div>

            <label className="toggle-line">
              <input
                type="checkbox"
                checked={config.drawAllPlayers}
                onChange={(event) =>
                  setConfig((currentConfig) => ({ ...currentConfig, drawAllPlayers: event.target.checked }))
                }
              />
              Sortear todos os jogadores
            </label>

            <div className="team-name-list">
              {Array.from({ length: config.teamCount }, (_, index) => (
                <label key={index}>
                  Time {index + 1}
                  <input
                    value={config.teamNames[index] || ""}
                    onChange={(event) => handleTeamNameChange(index, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="capacity-note">
              {config.drawAllPlayers
                ? `${validPlayers.length} jogadores serão distribuídos.`
                : `${Math.min(activeCapacity, validPlayers.length)} jogadores entram no primeiro sorteio.`}
              {estimatedSubstitutes > 0 ? ` ${estimatedSubstitutes} ficam como suplentes.` : ""}
              {estimatedVacancies > 0 ? ` ${estimatedVacancies} vagas aparecerão como Vaga Sobrando.` : ""}
            </div>

            <div className="button-stack">
              <button className="primary-button wide" type="button" onClick={handleDraw} disabled={!validPlayers.length}>
                <Shuffle aria-hidden="true" size={18} />
                Sortear times
              </button>
              <button className="secondary-button wide" type="button" onClick={handleDraw} disabled={!validPlayers.length}>
                <RefreshCw aria-hidden="true" size={18} />
                Sortear novamente
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading compact">
              <div>
                <span className="eyebrow">Local</span>
                <h2>Histórico</h2>
              </div>
              <button className="icon-button" type="button" onClick={handleClearHistory} title="Limpar histórico">
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </div>
            <p className="history-warning">O histórico fica salvo apenas neste navegador.</p>
            <div className="history-list">
              {history.length === 0 ? (
                <span>Nenhum sorteio salvo.</span>
              ) : (
                history.slice(0, 5).map((entry) => (
                  <span key={entry.id}>
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    }).format(new Date(entry.createdAt))}
                    {" · "}
                    {entry.teams.length} times
                  </span>
                ))
              )}
            </div>
          </section>

          <div className="status-box" role="status">
            {statusMessage}
          </div>
        </aside>
      </main>

      {result ? (
        <section className="results-band">
          <div className="results-heading">
            <div>
              <span className="eyebrow">Resultado</span>
              <h2>Times sorteados</h2>
            </div>
            <div className="button-row result-actions">
              <button className="primary-button" type="button" onClick={handleCopyResult}>
                <Clipboard aria-hidden="true" size={18} />
                {copyState === "copied" ? "Resultado copiado" : "Copiar resultado"}
              </button>
              <button className="secondary-button" type="button" onClick={handleCopyFullMessage}>
                <FileText aria-hidden="true" size={18} />
                {fullMessageCopyState === "copied" ? "Mensagem copiada" : "Copiar mensagem completa"}
              </button>
              <button className="secondary-button" type="button" onClick={handleExportPdf}>
                <Printer aria-hidden="true" size={18} />
                Exportar PDF
              </button>
            </div>
          </div>

          <div className="balance-line">
            <strong>{result.observation}</strong>
            <span>Diferença total: {result.balance.totalRange.toFixed(0)} estrelas</span>
            <span>Diferença de média: {result.balance.averageRange.toFixed(1)}</span>
            <span>Desconhecidos: variação de {result.balance.unknownRange}</span>
            <span>Jogadores: {result.teams.reduce((sum, team) => sum + team.players.length, 0)}</span>
            <span>Vagas sobrando: {result.teams.reduce((sum, team) => sum + team.vacancyCount, 0)}</span>
            <span>Suplentes: {result.substitutes.length}</span>
          </div>

          <div className="team-grid">
            {result.teams.map((team) => (
              <article className="team-card" key={team.id}>
                <div className="team-card-header">
                  <h3>{team.name}</h3>
                  <span>
                    {team.players.length}/{team.targetSize} jogadores
                  </span>
                </div>
                <ul>
                  {team.players.map((player) => (
                    <li key={player.id}>
                      <span>{player.name}</span>
                      <span className={player.wasUnknown ? "unknown-badge" : "star-badge"}>
                        {formatSkillLabel(player.skill, player.appliedSkill)}
                      </span>
                    </li>
                  ))}
                  {Array.from({ length: team.vacancyCount }, (_, index) => (
                    <li className="vacancy-line" key={`${team.id}-vacancy-${index}`}>
                      <strong>Vaga Sobrando</strong>
                    </li>
                  ))}
                </ul>
                <div className="team-metrics">
                  <span>Total: {team.totalSkill}</span>
                  <span>Média: {team.averageSkill.toFixed(1)}</span>
                  <span>Não conheço: {team.unknownCount}</span>
                </div>
              </article>
            ))}
          </div>

          {result.substitutes.length > 0 ? (
            <div className="substitutes-box">
              <h3>Suplentes</h3>
              <div>
                {result.substitutes.map((player) => (
                  <span key={player.id}>
                    {player.name} · {formatSkillLabel(player.skill, player.appliedSkill)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <footer className="site-footer">
        <div>
          Criado por Marcos Macêdo ·{" "}
          <a href="https://marcosmacedo.dev/" target="_blank" rel="noopener noreferrer">
            Conheça o criador
          </a>
        </div>
        <div>© 2026 Marcos Macêdo. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}

function parseSkillValue(value: string): SkillRating {
  if (value === "unknown") {
    return "unknown";
  }

  const numericValue = Number(value);
  return numericValue === 1 || numericValue === 2 || numericValue === 3 || numericValue === 4 || numericValue === 5
    ? numericValue
    : "unknown";
}

function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  fallbackCopy(text);
}

function fallbackCopy(text: string): void {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default App;
