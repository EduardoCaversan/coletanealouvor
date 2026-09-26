import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ContentScreen, TimerValue } from "./ContentScreen";
import { useApp } from "@/store/useApp";
import { type Content, timerSeconds } from "@/lib/content";
import { drawItems } from "@/lib/draw";
import { local } from "@/lib/storage";

export function ContentActions({ content }: { content: Content }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => useApp.getState().prepare(content)}>
        Preparar
      </Button>
      <Button
        variant="secondary"
        onClick={() => useApp.getState().addContent(content)}
      >
        + Roteiro
      </Button>
    </div>
  );
}

export function WorshipTools() {
  const endRevision = useApp((s) => s.endRevision);
  const [title, setTitle] = useState("CULTO DIVINO");
  const [body, setBody] = useState("Começaremos em breve.");
  const [minutes, setMinutes] = useState(5);
  const [timer, setTimer] = useState<Extract<Content, { kind: "timer" }>>({
    kind: "timer",
    title: "INÍCIO EM",
    duration: 300,
    remaining: 300,
    endsAt: null,
  });
  const [mode, setMode] = useState("numbers");
  useEffect(() => {
    setTimer((current) => ({ ...current, remaining: current.duration, endsAt: null }));
  }, [endRevision]);
  const [from, setFrom] = useState(1),
    [to, setTo] = useState(150),
    [quantity, setQuantity] = useState(1);
  const [names, setNames] = useState("");
  const [noRepeat, setNoRepeat] = useState(true);
  const [history, setHistory] = useState<string[]>(() =>
    local.get("draw-history", []),
  );
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState("");
  const draw = () => {
    try {
      if (
        mode === "numbers" &&
        (!Number.isInteger(from) ||
          !Number.isInteger(to) ||
          to < from ||
          to - from > 100000)
      )
        throw new Error(
          "Use números inteiros, com Até maior ou igual a De, e intervalo de até 100.000.",
        );
      const pool =
        mode === "numbers"
          ? Array.from({ length: to - from + 1 }, (_, i) => String(from + i))
          : names.split("\n");
      const selected = drawItems(pool, quantity, noRepeat, history);
      setResults(selected);
      setError("");
      const next = [...history, ...selected];
      setHistory(next);
      local.set("draw-history", next);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  const resetTimer = () => {
    const duration = Math.round(Math.min(180, Math.max(1, minutes || 5)) * 60);
    setTimer({ ...timer, duration, remaining: duration, endsAt: null });
  };
  return (
    <div className="library-scroll tools-panel">
      <details open>
        <summary>Texto rápido / tela de espera</summary>
        <label>
          Título
          <input
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Mensagem
          <textarea
            rows={4}
            maxLength={1500}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <ContentActions content={{ kind: "text", title, body }} />
      </details>
      <details open>
        <summary>Contagem regressiva</summary>
        <p className="hint">Privada até você preparar e colocar no ar.</p>
        <label>
          Título do timer
          <input
            maxLength={120}
            value={timer.title}
            onChange={(e) => setTimer({ ...timer, title: e.target.value })}
          />
        </label>
        <label>
          Minutos
          <input
            type="number"
            min={1}
            max={180}
            value={minutes}
            onChange={(e) => {
              const value = Number(e.target.value);
              setMinutes(value);
              if (value >= 1 && value <= 180) {
                const duration = Math.round(value * 60);
                setTimer({
                  ...timer,
                  duration,
                  remaining: duration,
                  endsAt: null,
                });
              }
            }}
          />
        </label>
        <div className="private-timer">
          <TimerValue timer={timer} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              setTimer({
                ...timer,
                remaining: timerSeconds(timer),
                endsAt:
                  timer.endsAt === null
                    ? Date.now() + timerSeconds(timer) * 1000
                    : null,
              })
            }
          >
            {timer.endsAt ? "Pausar" : "Iniciar"}
          </Button>
          <Button variant="secondary" onClick={resetTimer}>
            Redefinir
          </Button>
        </div>
        <ContentActions
          content={{ ...timer, remaining: timerSeconds(timer), endsAt: null }}
        />
      </details>
      <details>
        <summary>Sorteio</summary>
        <label>
          Tipo
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="numbers">Números</option>
            <option value="names">Nomes</option>
          </select>
        </label>
        {mode === "numbers" ? (
          <div className="grid grid-cols-2 gap-2">
            <label>
              De
              <input
                type="number"
                value={from}
                onChange={(e) => setFrom(Number(e.target.value))}
              />
            </label>
            <label>
              Até
              <input
                type="number"
                value={to}
                onChange={(e) => setTo(Number(e.target.value))}
              />
            </label>
          </div>
        ) : (
          <label>
            Um nome por linha
            <textarea
              rows={5}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              placeholder={"Ana\nJoão\nMaria"}
            />
          </label>
        )}
        <label>
          Quantidade
          <input
            type="number"
            min={1}
            max={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={noRepeat}
            onChange={(e) => setNoRepeat(e.target.checked)}
          />
          Não repetir, incluindo o histórico
        </label>
        <div className="flex gap-2">
          <Button onClick={draw}>Sortear</Button>
          <Button
            variant="secondary"
            disabled={!history.length}
            onClick={() => {
              if (
                confirm(
                  "Limpar os resultados e permitir sortear novamente todos os participantes?",
                )
              ) {
                setHistory([]);
                setResults([]);
                local.set("draw-history", []);
              }
            }}
          >
            Limpar
          </Button>
        </div>
        {error && (
          <p role="alert" className="feedback">
            {error}
          </p>
        )}
        {!!results.length && (
          <>
            <div className="aspect-video">
              <ContentScreen
                frame={{ kind: "draw", title: "SORTEIO", results }}
              />
            </div>
            <ContentActions
              content={{ kind: "draw", title: "SORTEIO", results }}
            />
          </>
        )}
        {!!history.length && (
          <p className="hint break-words">Sorteados: {history.join(", ")}</p>
        )}
      </details>
    </div>
  );
}
