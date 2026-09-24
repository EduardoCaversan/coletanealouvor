import { create } from "zustand";
import { clampPassage, findBook } from "@/lib/bible";
import { type BibleVersionId, DEFAULT_BIBLE_VERSION, isBibleVersion } from "@/lib/bibleVersions";
import { DEFAULT_PASSAGE_STYLE, type PassageStyle } from "@/lib/passageStyle";
import { openDisplayWindow } from "@/lib/screens";
import { loadBible, loadHymnal, loadVideoMap, local } from "@/lib/storage";
import { parseVideoId } from "@/lib/youtube";
import type {
  BibleBook,
  Hymn,
  PassageRef,
  PlayerState,
  SetlistItem,
  SetlistTemplate,
  VideoMap,
} from "@/lib/types";

const emptyPlayer: PlayerState = {
  ready: false,
  activated: false,
  playing: false,
  buffering: false,
  ended: false,
  currentTime: 0,
  duration: 0,
  error: null,
  updatedAt: 0,
};

type State = {
  hymns: Hymn[];
  loading: boolean;
  error: string | null;

  videos: VideoMap;

  bible: BibleBook[];
  bibleVersion: BibleVersionId;
  bibleLoading: boolean;

  setlist: SetlistItem[];
  /** Uid do item do roteiro em cartaz na projeção agora (hino ou passagem). */
  activeUid: string | null;
  /** Hino selecionado no painel (busca/roteiro) — só o que está em cartaz de verdade. */
  hymnId: number | null;
  /** Uid do item do roteiro correspondente ao hino selecionado, se veio de lá. */
  hymnUid: string | null;
  /** Hino em cartaz na projeção agora; só muda com uma ação explícita (Tocar, duplo clique, próximo/anterior). */
  liveHymnId: number | null;
  /** Passagem em cartaz na projeção; excludente com o vídeo do hino. */
  passage: PassageRef | null;
  /** Aparência da passagem na projeção (fonte, fundo, cor da letra). */
  passageStyle: PassageStyle;

  /** O que o operador quer que aconteça na projeção. */
  playing: boolean;
  blank: boolean;
  volume: number;
  seek: { time: number; nonce: number } | null;

  /** O que a janela de projeção informa de volta. */
  player: PlayerState;
  displayOpen: boolean;
  /** Referência à janela de projeção aberta por nós; null se nunca abrimos ou se já fechou. */
  displayWindow: Window | null;
  screenKey: string | null;
};

type Actions = {
  boot: () => Promise<void>;
  hymn: (id: number | null) => Hymn | null;
  videoOf: (id: number | null) => string | null;
  book: (abbrev: string) => BibleBook | null;
  setBibleVersion: (version: BibleVersionId) => Promise<void>;

  openHymn: (id: number, uid?: string | null) => void;
  /** Põe no ar o hino selecionado agora (sem tocar); usado por Tocar/duplo clique/próximo. */
  commitLive: () => void;
  putOnAir: () => Promise<void>;
  stepHymn: (delta: number) => void;

  openPassage: (ref: PassageRef, uid?: string | null) => void;
  closePassage: () => void;
  movePassageVerses: (delta: number) => void;
  setPassageStyle: (patch: Partial<PassageStyle>) => void;

  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  setBlank: (blank: boolean) => void;

  setVideo: (hymnId: number, input: string) => boolean;
  clearVideo: (hymnId: number) => void;
  exportVideos: () => void;

  addToSetlist: (id: number) => void;
  addPassageToSetlist: (ref: PassageRef) => void;
  addLabelToSetlist: (text: string) => void;
  renameSetlistLabel: (uid: string, text: string) => void;
  loadSetlistTemplate: (template: SetlistTemplate) => void;
  removeFromSetlist: (uid: string) => void;
  reorderSetlist: (items: SetlistItem[]) => void;
  clearSetlist: () => void;

  setPlayer: (state: PlayerState) => void;
  setDisplayOpen: (open: boolean) => void;
  /** Abre a janela de projeção (ou reaproveita a já aberta). false se o navegador bloqueou. */
  openDisplay: () => Promise<boolean>;
  closeDisplay: () => void;
  setScreenKey: (key: string | null) => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

/** Formato antigo do roteiro guardava só hinos, sem o campo "type". */
function normalizeSetlist(raw: unknown): SetlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): SetlistItem[] => {
    if (!item || typeof item !== "object" || typeof item.uid !== "string") return [];
    if (item.type === "hymn" && typeof item.hymnId === "number") return [item as SetlistItem];
    if (item.type === "label" && typeof item.text === "string") return [item as SetlistItem];
    if (
      item.type === "passage" &&
      typeof item.book === "string" &&
      typeof item.chapter === "number" &&
      typeof item.verseStart === "number" &&
      typeof item.verseEnd === "number"
    ) {
      return [item as SetlistItem];
    }
    if (item.type == null && typeof item.hymnId === "number") {
      return [{ uid: item.uid, type: "hymn", hymnId: item.hymnId }];
    }
    return [];
  });
}

export const useApp = create<State & Actions>((set, get) => ({
  hymns: [],
  loading: true,
  error: null,

  videos: {},

  bible: [],
  bibleVersion: (() => {
    const stored = local.get("bibleVersion", DEFAULT_BIBLE_VERSION);
    return isBibleVersion(stored) ? stored : DEFAULT_BIBLE_VERSION;
  })(),
  bibleLoading: false,

  setlist: normalizeSetlist(local.get<unknown[]>("setlist", [])),
  activeUid: null,
  hymnId: null,
  hymnUid: null,
  liveHymnId: null,
  passage: null,
  passageStyle: local.get("passageStyle", DEFAULT_PASSAGE_STYLE),

  playing: false,
  blank: false,
  volume: local.get("volume", 1),
  seek: null,

  player: emptyPlayer,
  displayOpen: false,
  displayWindow: null,
  screenKey: local.get<string | null>("screenKey", null),

  async boot() {
    try {
      const [hymnal, videos] = await Promise.all([
        loadHymnal((fresh) => set({ hymns: fresh.hymns })),
        loadVideoMap(),
      ]);
      set({ hymns: hymnal.hymns, videos, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Falha ao carregar o hinário",
      });
      return;
    }

    // A Bíblia é um recurso à parte: sem ela a busca de passagens some, mas o
    // hinário continua funcionando normalmente.
    await get().setBibleVersion(get().bibleVersion);
  },

  hymn(id) {
    if (id == null) return null;
    return get().hymns.find((hymn) => hymn.id === id) ?? null;
  },

  videoOf(id) {
    if (id == null) return null;
    return get().videos[String(id)] ?? null;
  },

  book(abbrev) {
    return findBook(get().bible, abbrev);
  },

  async setBibleVersion(version) {
    local.set("bibleVersion", version);
    set({ bibleVersion: version, bibleLoading: true });
    try {
      const bible = await loadBible(version, (fresh) => {
        if (get().bibleVersion === version) set({ bible: fresh.books });
      });
      if (get().bibleVersion === version) set({ bible: bible.books, bibleLoading: false });
    } catch {
      // Sem public/data/biblia-<versão>.json (ex: `npm run import:bible` não rodou ainda).
      if (get().bibleVersion === version) set({ bibleLoading: false });
    }
  },

  openHymn(id, itemUid = null) {
    // Só seleciona (busca/roteiro): olhar um hino não pode mexer no que já está no ar.
    // O ar só muda com commitLive (Tocar, duplo clique, próximo/anterior).
    set({ hymnId: id, hymnUid: itemUid });
  },

  commitLive() {
    // Põe no ar o hino selecionado agora; começa parado, o operador decide quando toca.
    set({
      liveHymnId: get().hymnId,
      activeUid: get().hymnUid,
      passage: null,
      playing: false,
      seek: null,
      player: { ...emptyPlayer, activated: get().player.activated },
    });
  },

  async putOnAir() {
    if (get().hymnId == null || !get().videoOf(get().hymnId)) return;
    get().commitLive();
    if (!get().displayOpen) await get().openDisplay();
  },

  stepHymn(delta) {
    // Etapas da programação sem hino (ex: "Oração") não têm o que projetar, então
    // navegar pelo teclado pula direto para o próximo/anterior hino da lista, sempre no ar
    // (é um controle de show, não uma busca).
    const hymnItems = get().setlist.filter(
      (item): item is Extract<SetlistItem, { type: "hymn" }> => item.type === "hymn",
    );
    if (hymnItems.length === 0) return;
    const { activeUid } = get();
    const current = hymnItems.findIndex((item) => item.uid === activeUid);
    const next = hymnItems[Math.min(Math.max(current + delta, 0), hymnItems.length - 1)];
    if (!next || next.uid === activeUid) return;
    get().openHymn(next.hymnId, next.uid);
    get().commitLive();
  },

  openPassage(ref, itemUid = null) {
    // Passagem substitui o vídeo na tela; o hino fica pausado até o operador voltar a ele.
    // Já é uma ação explícita de "botar no ar" (botão Projetar / duplo clique no roteiro).
    set({
      passage: clampPassage(get().bible, ref) ?? ref,
      activeUid: itemUid,
      liveHymnId: null,
      playing: false,
    });
  },

  closePassage() {
    set({ passage: null, activeUid: null });
  },

  movePassageVerses(delta) {
    const { passage, bible } = get();
    if (!passage) return;
    const chapter = findBook(bible, passage.book)?.chapters[passage.chapter - 1];
    if (!chapter) return;
    const span = passage.verseEnd - passage.verseStart;
    const verseStart = Math.min(Math.max(passage.verseStart + delta, 1), chapter.length - span);
    set({ passage: { ...passage, verseStart, verseEnd: verseStart + span } });
  },

  setPassageStyle(patch) {
    const passageStyle = { ...get().passageStyle, ...patch };
    local.set("passageStyle", passageStyle);
    set({ passageStyle });
  },

  async play() {
    if (!get().videoOf(get().hymnId)) return;
    get().commitLive();
    // Tocar sem projeção aberta não mostra nada; abrimos por conta do operador.
    if (!get().displayOpen) await get().openDisplay();
    set({ playing: true });
  },

  pause() {
    set({ playing: false });
  },

  toggle() {
    if (get().playing) get().pause();
    else if (get().videoOf(get().liveHymnId)) {
      if (!get().displayOpen) void get().openDisplay();
      set({ playing: true });
    }
  },

  seekTo(time) {
    set({ seek: { time: Math.max(0, time), nonce: Date.now() } });
  },

  setVolume(volume) {
    local.set("volume", volume);
    set({ volume });
  },

  setBlank(blank) {
    set({ blank });
  },

  setVideo(hymnId, input) {
    const videoId = parseVideoId(input);
    if (!videoId) return false;
    const videos = { ...get().videos, [String(hymnId)]: videoId };
    local.set("videos", { ...local.get<VideoMap>("videos", {}), [String(hymnId)]: videoId });
    set({ videos });
    return true;
  },

  clearVideo(hymnId) {
    const videos = { ...get().videos };
    delete videos[String(hymnId)];
    const stored = { ...local.get<VideoMap>("videos", {}) };
    delete stored[String(hymnId)];
    local.set("videos", stored);
    // Só para a projeção se o hino editado for o que está no ar; mexer no link de
    // outro hino não pode interromper o que já está tocando.
    set({ videos, playing: hymnId === get().liveHymnId ? false : get().playing });
  },

  /** Baixa o mapa completo para virar public/data/videos.json no projeto. */
  exportVideos() {
    const blob = new Blob([JSON.stringify(get().videos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "videos.json";
    link.click();
    URL.revokeObjectURL(url);
  },

  addToSetlist(id) {
    const setlist: SetlistItem[] = [...get().setlist, { uid: uid(), type: "hymn", hymnId: id }];
    local.set("setlist", setlist);
    set({ setlist });
  },

  addPassageToSetlist(ref) {
    const setlist: SetlistItem[] = [...get().setlist, { uid: uid(), type: "passage", ...ref }];
    local.set("setlist", setlist);
    set({ setlist });
  },

  addLabelToSetlist(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const setlist: SetlistItem[] = [...get().setlist, { uid: uid(), type: "label", text: trimmed }];
    local.set("setlist", setlist);
    set({ setlist });
  },

  renameSetlistLabel(itemUid, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const setlist = get().setlist.map((item): SetlistItem =>
      item.uid === itemUid && item.type === "label" ? { ...item, text: trimmed } : item,
    );
    local.set("setlist", setlist);
    set({ setlist });
  },

  /** Acrescenta as etapas do modelo (culto de sábado, escola sabatina, ...) ao roteiro atual. */
  loadSetlistTemplate(template) {
    const items: SetlistItem[] = template.items.map((text) => ({ uid: uid(), type: "label", text }));
    const setlist = [...get().setlist, ...items];
    local.set("setlist", setlist);
    set({ setlist });
  },

  removeFromSetlist(itemUid) {
    const setlist = get().setlist.filter((item) => item.uid !== itemUid);
    local.set("setlist", setlist);
    set({ setlist, activeUid: get().activeUid === itemUid ? null : get().activeUid });
  },

  reorderSetlist(items) {
    local.set("setlist", items);
    set({ setlist: items });
  },

  clearSetlist() {
    local.set("setlist", []);
    set({ setlist: [], activeUid: null });
  },

  setPlayer(state) {
    // O fim do vídeo volta o botão para "tocar", sem mexer na tela.
    set({ player: state, playing: state.ended ? false : get().playing });
  },

  setDisplayOpen(open) {
    // Só o sinalizador do canal; a referência da janela é responsabilidade de
    // openDisplay/closeDisplay (o canal pode soltar "fechou" sem a janela ter fechado
    // de verdade — remontagem em StrictMode, por exemplo).
    set({ displayOpen: open, player: open ? get().player : emptyPlayer });
  },

  async openDisplay() {
    // A permissão de gerenciamento de janelas só é concedida dentro de um gesto
    // do usuário, por isso isto só deve rodar a partir de um clique/tecla real.
    const opened = await openDisplayWindow(get().screenKey);
    if (!opened) return false;
    set({ displayWindow: opened.window, displayOpen: true });
    return true;
  },

  closeDisplay() {
    get().displayWindow?.close();
    set({ displayWindow: null, displayOpen: false, player: emptyPlayer });
  },

  setScreenKey(key) {
    local.set("screenKey", key);
    set({ screenKey: key });
  },
}));
