import { useDeferredValue, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  BookOpen,
  ChevronLeft,
  ListPlus,
  Loader2,
  MonitorPlay,
  Search as SearchIcon,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { findBook } from "@/lib/bible";
import { BIBLE_VERSIONS } from "@/lib/bibleVersions";
import { DEFAULT_PASSAGE_STYLE } from "@/lib/passageStyle";
import { local } from "@/lib/storage";
import { cn, normalize } from "@/lib/utils";
import { useApp } from "@/store/useApp";
import type { PassageRef } from "@/lib/types";

type Range = { start: number; end: number };
type Order = "biblia" | "alfabetica";

/** Escolha de tradução, livro → capítulo → versículo(s) para projetar uma passagem. */
export function BibleSearch() {
  const bible = useApp((state) => state.bible);
  const bibleVersion = useApp((state) => state.bibleVersion);
  const bibleLoading = useApp((state) => state.bibleLoading);
  const bibleError = useApp((state) => state.bibleError);
  const setBibleVersion = useApp((state) => state.setBibleVersion);
  const passageStyle = useApp((state) => state.passageStyle);
  const setPassageStyle = useApp((state) => state.setPassageStyle);
  const openPassage = useApp((state) => state.openPassage);
  const addPassageToSetlist = useApp((state) => state.addPassageToSetlist);

  const [term, setTerm] = useState("");
  const deferred = useDeferredValue(term);
  const [order, setOrder] = useState<Order>(() => local.get<Order>("bibleBookOrder", "biblia"));
  const [showSettings, setShowSettings] = useState(false);
  const [bookAbbrev, setBookAbbrev] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [range, setRange] = useState<Range | null>(null);

  const book = bookAbbrev ? findBook(bible, bookAbbrev) : null;
  const verses = book && chapter ? book.chapters[chapter - 1] : null;

  const changeOrder = (next: Order) => {
    local.set("bibleBookOrder", next);
    setOrder(next);
  };

  const books = useMemo(() => {
    const ordered =
      order === "alfabetica" ? [...bible].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) : bible;
    const query = normalize(deferred).trim();
    if (!query) return ordered;
    return ordered.filter((candidate) => candidate.search.includes(query));
  }, [bible, deferred, order]);

  const chooseBook = (abbrev: string) => {
    setBookAbbrev(abbrev);
    setChapter(null);
    setRange(null);
  };

  const chooseChapter = (n: number) => {
    setChapter(n);
    setRange(null);
  };

  const clickVerse = (n: number, extend: boolean) => {
    setRange((current) => {
      if (extend && current) {
        return n < current.start ? { start: n, end: current.end } : { start: current.start, end: n };
      }
      return { start: n, end: n };
    });
  };

  const ref = (): PassageRef | null =>
    book && chapter && range
      ? { book: book.abbrev, chapter, verseStart: range.start, verseEnd: range.end }
      : null;

  const gearButton = (
    <Button
      variant={showSettings ? "secondary" : "ghost"}
      size="icon"
      className="shrink-0"
      onClick={() => setShowSettings((v) => !v)}
      title="Configurações"
    >
      <Settings className="size-4" />
    </Button>
  );

  const settingsPanel = showSettings && (
    <div className="space-y-4 border-b border-ink-800 p-3">
      <div>
        <label className="mb-1 block text-xs text-ink-400">Tradução</label>
        <div className="flex gap-1">
          {BIBLE_VERSIONS.map((version) => (
            <button
              key={version.id}
              onClick={() => setBibleVersion(version.id)}
              disabled={bibleLoading}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-xs font-medium disabled:opacity-60",
                bibleVersion === version.id ? "bg-ink-700 text-ink-100" : "bg-ink-800 text-ink-400 hover:text-ink-200",
              )}
              title={version.name}
            >
              {version.id === bibleVersion && bibleLoading ? (
                <Loader2 className="mx-auto size-3.5 animate-spin" />
              ) : (
                version.abbrev
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-400">Ordem dos livros</label>
        <div className="flex gap-1">
          <OrderButton label="Ordem da Bíblia" active={order === "biblia"} onClick={() => changeOrder("biblia")} />
          <OrderButton
            label="A-Z"
            icon={<ArrowDownAZ className="size-3.5" />}
            active={order === "alfabetica"}
            onClick={() => changeOrder("alfabetica")}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 flex justify-between text-xs text-ink-400">
          <span>Tamanho da fonte na projeção</span>
          <span className="tabular-nums">{passageStyle.fontSize.toFixed(1)}rem</span>
        </label>
        <Slider
          value={[passageStyle.fontSize]}
          min={1.5}
          max={5}
          step={0.1}
          onValueChange={([value]) => setPassageStyle({ fontSize: value })}
        />
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 items-center gap-2 text-xs text-ink-400">
          Fundo
          <input
            type="color"
            value={passageStyle.background}
            onChange={(event) => setPassageStyle({ background: event.target.value })}
            className="h-8 flex-1 rounded border border-ink-700 bg-transparent"
          />
        </label>
        <label className="flex flex-1 items-center gap-2 text-xs text-ink-400">
          Letra
          <input
            type="color"
            value={passageStyle.color}
            onChange={(event) => setPassageStyle({ color: event.target.value })}
            className="h-8 flex-1 rounded border border-ink-700 bg-transparent"
          />
        </label>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setPassageStyle(DEFAULT_PASSAGE_STYLE)}>
        Restaurar aparência padrão
      </Button>
    </div>
  );

  if (!bible.length) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-end border-b border-ink-800 p-2">{gearButton}</div>
        {settingsPanel}
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-ink-400">
          {bibleLoading ? (
            "Carregando…"
          ) : bibleError ? (
            <span>
              Bíblia indisponível no momento. <span className="text-amber-400">{bibleError}</span>
            </span>
          ) : (
            <span>
              Bíblia não disponível. Rode <code className="mx-1">npm run import:bible</code> e recarregue.
            </span>
          )}
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 p-3">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setTerm("")}
              placeholder="Buscar livro da Bíblia"
              className="pl-9"
              autoComplete="off"
            />
            {term && (
              <button
                onClick={() => setTerm("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-400 hover:text-ink-200"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {gearButton}
        </div>
        {settingsPanel}

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {books.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-400">Nenhum livro encontrado.</p>
          ) : (
            <div className="columns-2 gap-2 lg:columns-3">
              {books.map((candidate) => (
                <button
                  key={candidate.abbrev}
                  onClick={() => chooseBook(candidate.abbrev)}
                  className="mb-2 block w-full truncate rounded-lg bg-ink-800 px-3 py-2.5 text-left text-sm break-inside-avoid text-ink-200 hover:bg-ink-700"
                  title={candidate.name}
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <BackHeader label={book.name} onBack={() => setBookAbbrev(null)} right={gearButton} />
        {settingsPanel}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-6 gap-1.5">
            {book.chapters.map((_, index) => (
              <button
                key={index}
                onClick={() => chooseChapter(index + 1)}
                className="rounded-lg bg-ink-800 py-2 text-sm text-ink-200 tabular-nums hover:bg-ink-700"
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BackHeader label={`${book.name} ${chapter}`} onBack={() => setChapter(null)} right={gearButton} />
      {settingsPanel}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-6 gap-1.5">
          {verses?.map((_, index) => {
            const n = index + 1;
            const selected = range && n >= range.start && n <= range.end;
            return (
              <button
                key={n}
                onClick={(event) => clickVerse(n, event.shiftKey)}
                className={cn(
                  "rounded-lg py-2 text-sm tabular-nums",
                  selected ? "bg-brand-600 font-semibold text-ink-950" : "bg-ink-800 text-ink-200 hover:bg-ink-700",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>

        {range && verses && (
          <div className="mt-3 space-y-2 rounded-lg border border-ink-800 bg-ink-900 p-3">
            {verses.slice(range.start - 1, range.end).map((text, index) => (
              <p key={range.start + index} className="text-sm text-ink-300">
                <span className="mr-2 tabular-nums text-brand-400">{range.start + index}</span>
                {text}
              </p>
            ))}
          </div>
        )}
      </div>

      {range && (
        <div className="flex gap-1.5 border-t border-ink-800 p-3">
          <Button
            className="flex-1"
            onClick={() => {
              const passage = ref();
              if (passage) openPassage(passage);
            }}
          >
            <MonitorPlay className="size-4" />
            Projetar {range.start === range.end ? range.start : `${range.start}-${range.end}`}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            title="Adicionar ao roteiro"
            onClick={() => {
              const passage = ref();
              if (passage) addPassageToSetlist(passage);
            }}
          >
            <ListPlus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function OrderButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium",
        active ? "bg-ink-700 text-ink-100" : "bg-ink-800 text-ink-400 hover:text-ink-200",
      )}
    >
      {icon ?? <BookOpen className="size-3.5" />}
      {label}
    </button>
  );
}

function BackHeader({
  label,
  onBack,
  right,
}: {
  label: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-ink-800 p-3">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack} aria-label="Voltar">
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-200">{label}</span>
      {right}
    </div>
  );
}
