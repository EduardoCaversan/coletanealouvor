import { useEffect, useState } from "react";
import { BookOpen, ListMusic, Radio, Search } from "lucide-react";
import { BibleSearch } from "@/components/BibleSearch";
import { Button } from "@/components/ui/button";
import { HymnSearch } from "@/components/HymnSearch";
import { Setlist } from "@/components/Setlist";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { TopBar } from "@/components/TopBar";
import { Transport } from "@/components/Transport";
import { useControlLink } from "@/lib/useLive";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/useApp";

type Tab = "hinos" | "biblia" | "roteiro" | "ao-vivo";

export default function Control() {
  useControlLink();

  const loading = useApp((state) => state.loading);
  const error = useApp((state) => state.error);
  const boot = useApp((state) => state.boot);
  const [tab, setTab] = useState<Tab>("hinos");
  const [showShortcuts, setShowShortcuts] = useState(false);
  useShortcuts(() => setShowShortcuts(true), showShortcuts);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (loading) return <Splash message="Carregando o hinário…" />;
  if (error) {
    return (
      <Splash message={`Não foi possível carregar o hinário: ${error}`}>
        <Button variant="secondary" size="sm" onClick={() => void boot()}>
          Tentar novamente
        </Button>
      </Splash>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-ink-950">
      <TopBar onShowShortcuts={() => setShowShortcuts(true)} />
      <ShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />

      {/* Desktop: hinos, bíblia, programação e comando lado a lado. Mobile: uma aba por vez. */}
      <main className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px_360px]">
        <section
          className={cn("min-h-0 border-ink-800 lg:border-r", tab === "hinos" ? "block" : "hidden lg:block")}
        >
          <HymnSearch />
        </section>

        <section
          className={cn("min-h-0 border-ink-800 lg:border-r", tab === "biblia" ? "block" : "hidden lg:block")}
        >
          <BibleSearch />
        </section>

        <section
          className={cn(
            "min-h-0 border-ink-800 lg:border-r",
            tab === "roteiro" ? "block" : "hidden lg:block",
          )}
        >
          <Setlist />
        </section>

        <section className={cn("min-h-0", tab === "ao-vivo" ? "block" : "hidden lg:block")}>
          <Transport />
        </section>
      </main>

      <nav className="flex border-t border-ink-800 bg-ink-900 lg:hidden">
        <TabButton
          icon={<Search className="size-5" />}
          label="Hinos"
          active={tab === "hinos"}
          onClick={() => setTab("hinos")}
        />
        <TabButton
          icon={<BookOpen className="size-5" />}
          label="Bíblia"
          active={tab === "biblia"}
          onClick={() => setTab("biblia")}
        />
        <TabButton
          icon={<ListMusic className="size-5" />}
          label="Programação"
          active={tab === "roteiro"}
          onClick={() => setTab("roteiro")}
        />
        <TabButton
          icon={<Radio className="size-5" />}
          label="Ao vivo"
          active={tab === "ao-vivo"}
          onClick={() => setTab("ao-vivo")}
        />
      </nav>
    </div>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
        active ? "text-brand-400" : "text-ink-400",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Splash({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center text-sm text-ink-400">
      <p>{message}</p>
      {children}
    </div>
  );
}

function useShortcuts(showHelp: () => void, shortcutsOpen: boolean) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (shortcutsOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']")) return;
      if ((event.key === "Enter" || event.key === " ") && target?.closest("button, a, [role='button']")) return;

      const store = useApp.getState();
      const key = event.key.toLowerCase();

      if (event.key === "?") {
        event.preventDefault();
        showHelp();
      } else if (event.key === "Enter") {
        event.preventDefault();
        void store.putOnAir();
      } else if (event.key === " ") {
        event.preventDefault();
        store.toggle();
      } else if (event.key === "ArrowRight" || event.key === "PageDown" || key === "n") {
        if (store.passage) store.movePassageVerses(1);
        else store.stepHymn(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp" || key === "p") {
        if (store.passage) store.movePassageVerses(-1);
        else store.stepHymn(-1);
      } else if (key === "b") {
        store.setBlank(!store.blank);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelp, shortcutsOpen]);
}
