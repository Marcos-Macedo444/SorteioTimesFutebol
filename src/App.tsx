import {
  Clipboard,
  Download,
  FileText,
  Moon,
  Printer,
  RefreshCw,
  Shuffle,
  Sparkles,
  Sun,
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
import { cleanNumericDraft, commitNumericDraft, isInNumericRange, readNumericDraft } from "./lib/numericInput";
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

type ThemeMode = "dark" | "light";
type CopyStatus = "idle" | "copied" | "error";

const THEME_STORAGE_KEY = "sorteio-times-pelada:theme";
const TEAM_COUNT_RANGE = { min: 2, max: 10 };
const PLAYERS_PER_TEAM_RANGE = { min: 1, max: 30 };
const LIST_TEMPLATE = `VALOR: R$
Pix:

Nome:
Banco:

Futebol (INFORMAR DATA)
De XX:XX às XX:XX - LOCAL

LISTA ABERTA

1-
2-
3-
4-
5-
6-
7-
8-
9-
10-
11-
12-
13-
14-
15-
16-
17-
18-
19-
20-
21-
22-
23-
24-

⚠️🚨 Regras do FUT: ⚠️🚨

1#
2#
3#
4#
5#`;
const PELADA_PLACEHOLDER = `Exemplo:

VALOR: R$ 20,00
Pix: será enviado no grupo

Futebol sexta-feira
21h às 23h - Green Ball

LISTA ABERTA

1 Theo
2 Jayme
3 Matheus
4 João Victor
5 Gabriel Santos
6 Luiz Fernando

Suplentes:

⚠️ Regras:

* Chegar 20 minutos antes
* Jogo acaba com 2 gols ou 7 minutos

O sistema vai puxar só os nomes numerados e depois pode montar a mensagem final com os times sorteados.`;

function App() {
  const initialState = useMemo(() => loadAppState(), []);
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemePreference());
  const [rawText, setRawText] = useState(initialState.rawText);
  const [players, setPlayers] = useState<Player[]>(initialState.players);
  const [config, setConfig] = useState<DrawConfig>(initialState.config);
  const [teamCountInput, setTeamCountInput] = useState(String(initialState.config.teamCount));
  const [playersPerTeamInput, setPlayersPerTeamInput] = useState(String(initialState.config.playersPerTeam));
  const [history, setHistory] = useState(initialState.history);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("Pronto para sortear.");
  const [templateCopyState, setTemplateCopyState] = useState<CopyStatus>("idle");
  const [copyState, setCopyState] = useState<CopyStatus>("idle");
  const [fullMessageCopyState, setFullMessageCopyState] = useState<CopyStatus>("idle");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveAppState({ rawText, players, config, history });
  }, [rawText, players, config, history]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setTeamCountInput(String(config.teamCount));
    setPlayersPerTeamInput(String(config.playersPerTeam));
  }, [config.teamCount, config.playersPerTeam]);

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

  function handleTeamCountInputChange(value: string) {
    const draft = cleanNumericDraft(value);
    const parsed = readNumericDraft(draft);
    setTeamCountInput(draft);

    if (parsed !== null && isInNumericRange(parsed, TEAM_COUNT_RANGE)) {
      handleTeamCountChange(parsed);
    }
  }

  function handleTeamCountInputBlur() {
    const nextValue = commitNumericDraft(teamCountInput, {
      ...TEAM_COUNT_RANGE,
      fallback: config.teamCount
    });
    setTeamCountInput(String(nextValue));
    handleTeamCountChange(nextValue);
  }

  function handlePlayersPerTeamInputChange(value: string) {
    const draft = cleanNumericDraft(value);
    const parsed = readNumericDraft(draft);
    setPlayersPerTeamInput(draft);

    if (parsed !== null && isInNumericRange(parsed, PLAYERS_PER_TEAM_RANGE)) {
      setConfig((currentConfig) => ({
        ...currentConfig,
        playersPerTeam: parsed
      }));
    }
  }

  function handlePlayersPerTeamInputBlur() {
    const nextValue = commitNumericDraft(playersPerTeamInput, {
      ...PLAYERS_PER_TEAM_RANGE,
      fallback: config.playersPerTeam
    });
    setPlayersPerTeamInput(String(nextValue));
    setConfig((currentConfig) => ({
      ...currentConfig,
      playersPerTeam: nextValue
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

  async function handleCopyListTemplate() {
    try {
      await copyText(LIST_TEMPLATE);
      setTemplateCopyState("copied");
      setStatusMessage("Modelo de lista copiado para usar como base.");
    } catch {
      setTemplateCopyState("error");
      setStatusMessage("Não foi possível copiar o modelo automaticamente.");
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
    setTemplateCopyState("idle");
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
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {theme === "dark" ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
            {theme === "dark" ? "Modo claro" : "Modo escuro"}
          </button>
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
                <h2>Lista completa da pelada</h2>
              </div>
              <div className="button-row">
                <button className="secondary-button" type="button" onClick={handleClearAll}>
                  <Trash2 aria-hidden="true" size={18} />
                  Limpar dados salvos
                </button>
              </div>
            </div>
            <div className="entry-guidance">
              <p>
                Cole aqui a mensagem inteira da pelada. Pode vir com valor, Pix, horário, local, regras e avisos.
              </p>
              <p>
                O sistema vai separar somente os jogadores numerados e, no final, você poderá gerar uma nova mensagem
                mantendo as informações originais.
              </p>
            </div>
            <div className="template-helper">
              <p>Sem uma lista pronta? Copie o modelo abaixo e use como base no grupo da pelada.</p>
              <div className="button-row template-actions">
                <button className="secondary-button" type="button" onClick={handleCopyListTemplate}>
                  <Clipboard aria-hidden="true" size={18} />
                  Copiar modelo de lista
                </button>
                {templateCopyState === "copied" ? (
                  <span className="inline-feedback" role="status">
                    Modelo copiado!
                  </span>
                ) : null}
                {templateCopyState === "error" ? (
                  <span className="inline-feedback error-feedback" role="status">
                    Não foi possível copiar.
                  </span>
                ) : null}
              </div>
            </div>
            <textarea
              className="raw-input"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder={PELADA_PLACEHOLDER}
              spellCheck={false}
            />
            <p className="input-tip">Dica: cole a mensagem completa. O sistema ignora o contexto e usa apenas os nomes numerados.</p>
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

            <p className="helper-text">Não conheço: entra como peso médio de 3 estrelas no sorteio.</p>

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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={teamCountInput}
                  onChange={(event) => handleTeamCountInputChange(event.target.value)}
                  onBlur={handleTeamCountInputBlur}
                />
              </label>
              <label>
                Jogadores por time
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={playersPerTeamInput}
                  disabled={config.drawAllPlayers}
                  onChange={(event) => handlePlayersPerTeamInputChange(event.target.value)}
                  onBlur={handlePlayersPerTeamInputBlur}
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
                        {formatSkillLabel(player.skill)}
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
                    {player.name} · {formatSkillLabel(player.skill)}
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

function loadThemePreference(): ThemeMode {
  if (typeof localStorage === "undefined") {
    return "dark";
  }

  return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
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
