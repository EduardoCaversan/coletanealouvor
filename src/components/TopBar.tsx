import { useEffect, useState } from "react";
import { CircleHelp, MonitorPlay, MonitorX } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/logo.png";
import { listScreens, supportsScreenPlacement, type ScreenInfo } from "@/lib/screens";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/useApp";

export function TopBar({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const displayOpen = useApp((state) => state.displayOpen);
  const displayWindow = useApp((state) => state.displayWindow);
  const openDisplay = useApp((state) => state.openDisplay);
  const closeDisplay = useApp((state) => state.closeDisplay);
  const screenKey = useApp((state) => state.screenKey);
  const setScreenKey = useApp((state) => state.setScreenKey);
  const [screens, setScreens] = useState<ScreenInfo[]>([]);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!displayWindow) return;
    const timer = window.setInterval(() => {
      if (displayWindow.closed) closeDisplay();
    }, 1000);
    return () => clearInterval(timer);
  }, [displayWindow, closeDisplay]);

  const open = async () => {
    // A permissão de gerenciamento de janelas só é concedida dentro de um gesto
    // do usuário, por isso pedimos as telas aqui e não na carga da página.
    if (supportsScreenPlacement()) setScreens(await listScreens());
    const ok = await openDisplay();
    setHint(ok ? null : "O navegador bloqueou a janela. Libere pop-ups para este site.");
  };

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-ink-800 bg-ink-900 px-3 py-2">
      <h1 className="mr-auto flex items-center gap-2 text-sm font-semibold text-ink-200">
        <img src={logoUrl} alt="" className="h-7 w-auto" />
        <span>
          Coletânea <span className="text-brand-400">de Louvor</span>
        </span>
      </h1>

      {screens.length > 1 && (
        <select
          value={screenKey ?? ""}
          onChange={(event) => setScreenKey(event.target.value || null)}
          className="h-9 rounded-lg border border-ink-700 bg-ink-800 px-2 text-xs text-ink-200"
        >
          <option value="">Tela automática</option>
          {screens.map((screen) => (
            <option key={screen.key} value={screen.key}>
              {screen.label} · {screen.width}×{screen.height}
            </option>
          ))}
        </select>
      )}

      <span
        className={cn(
          "hidden items-center gap-1.5 text-xs sm:flex",
          displayOpen ? "text-brand-400" : "text-ink-400",
        )}
      >
        <span
          className={cn("size-2 rounded-full", displayOpen ? "bg-brand-500" : "bg-ink-600")}
        />
        {displayOpen ? "Projeção conectada" : "Projeção fechada"}
      </span>

      <Button variant="ghost" size="icon" onClick={onShowShortcuts} title="Atalhos (?)" aria-label="Ver atalhos">
        <CircleHelp className="size-4" />
      </Button>

      {displayOpen && displayWindow ? (
        <Button variant="outline" onClick={closeDisplay}>
          <MonitorX className="size-4" />
          Fechar projeção
        </Button>
      ) : (
        <Button onClick={open}>
          <MonitorPlay className="size-4" />
          Abrir projeção
        </Button>
      )}

      {hint && <p className="w-full text-xs text-amber-400">{hint}</p>}
    </header>
  );
}
