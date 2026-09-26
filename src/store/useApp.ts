import { create } from "zustand";
import {
  clampPassage,
  findBook,
  moveVerse,
  passageReference,
} from "@/lib/bible";
import {
  adjacentContent,
  contentKey,
  hymnContent,
  isContent,
  resolveContent,
  timerSeconds,
  type Content,
  type Frame,
} from "@/lib/content";
import {
  type BibleVersionId,
  DEFAULT_BIBLE_VERSION,
  isBibleVersion,
} from "@/lib/bibleVersions";
import { DEFAULT_PASSAGE_STYLE, type PassageStyle } from "@/lib/passageStyle";
import { openDisplayWindow } from "@/lib/screens";
import { loadBible, loadHymnal, loadVideoMap, local } from "@/lib/storage";
import { parseVideoId } from "@/lib/youtube";
import { readAsset } from "@/lib/media";
import type {
  BibleBook,
  Hymn,
  PassageRef,
  PlayerState,
  SavedServicePlan,
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
  endRevision: number;
  preview: Content | null;
  previewUid: string | null;
  liveContent: Content | null;
  liveFrame: Frame | null;
  favorites: Content[];
  recent: Content[];
  simpleMode: boolean;
  notice: string | null;
  retryAt: number;
  liveBible: BibleBook[];
  hymns: Hymn[];
  loading: boolean;
  error: string | null;

  videos: VideoMap;

  bible: BibleBook[];
  bibleVersion: BibleVersionId;
  bibleLoading: boolean;
  bibleError: string | null;

  setlist: SetlistItem[];
  savedPlans: SavedServicePlan[];
  currentPlanId: string | null;
  planName: string;
  planDate: string;
  planDirty: boolean;
  undoSetlist: SetlistItem[] | null;
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
  endPresentation: () => void;
  prepare: (content: Content, uid?: string | null) => void;
  take: () => void;
  stepLive: (delta: number) => void;
  prepareItem: (item: SetlistItem) => void;
  addContent: (content: Content) => void;
  toggleFavorite: (content: Content) => void;
  setSimpleMode: (simple: boolean) => void;
  controlTimer: (
    action: "start" | "pause" | "reset",
    target: "preview" | "live",
  ) => void;
  retryVideo: () => void;
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
  setSetlistItemNote: (uid: string, note: string) => void;
  duplicateSetlistItem: (uid: string) => void;
  loadSetlistTemplate: (template: SetlistTemplate) => void;
  removeFromSetlist: (uid: string) => void;
  reorderSetlist: (items: SetlistItem[]) => void;
  clearSetlist: () => void;
  undoSetlistChange: () => void;

  setPlanDetails: (name: string, date: string) => void;
  saveServicePlan: () => boolean;
  loadServicePlan: (id: string) => void;
  duplicateServicePlan: (id: string) => void;
  deleteServicePlan: (id: string) => void;

  setPlayer: (state: PlayerState) => void;
  setDisplayOpen: (open: boolean) => void;
  /** Abre a janela de projeção (ou reaproveita a já aberta). false se o navegador bloqueou. */
  openDisplay: () => Promise<boolean>;
  closeDisplay: () => void;
  setScreenKey: (key: string | null) => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const itemNote = (item: { note?: unknown }) =>
  typeof item.note === "string" && item.note.trim() ? { note: item.note } : {};
const copyItems = (items: SetlistItem[]) =>
  items.map((item) => ({ ...item, uid: uid() }));

/** Formato antigo do roteiro guardava só hinos, sem o campo "type". */
function normalizeSetlist(raw: unknown): SetlistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): SetlistItem[] => {
    if (!item || typeof item !== "object" || typeof item.uid !== "string")
      return [];
    if (item.type === "content" && isContent(item.content))
      return [
        {
          uid: item.uid,
          type: "content",
          content: item.content,
          ...itemNote(item),
        },
      ];
    if (item.type === "hymn" && typeof item.hymnId === "number") {
      return [
        { uid: item.uid, type: "hymn", hymnId: item.hymnId, ...itemNote(item) },
      ];
    }
    if (item.type === "label" && typeof item.text === "string") {
      return [
        { uid: item.uid, type: "label", text: item.text, ...itemNote(item) },
      ];
    }
    if (
      item.type === "passage" &&
      typeof item.book === "string" &&
      typeof item.chapter === "number" &&
      typeof item.verseStart === "number" &&
      typeof item.verseEnd === "number"
    ) {
      return [
        {
          uid: item.uid,
          type: "passage",
          book: item.book,
          chapter: item.chapter,
          verseStart: item.verseStart,
          verseEnd: item.verseEnd,
          ...itemNote(item),
        },
      ];
    }
    if (item.type == null && typeof item.hymnId === "number") {
      return [{ uid: item.uid, type: "hymn", hymnId: item.hymnId }];
    }
    return [];
  });
}

function normalizeSavedPlans(raw: unknown): SavedServicePlan[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((plan): SavedServicePlan[] => {
    if (
      !plan ||
      typeof plan !== "object" ||
      typeof plan.id !== "string" ||
      typeof plan.name !== "string" ||
      typeof plan.date !== "string"
    ) {
      return [];
    }
    const createdAt =
      typeof plan.createdAt === "number" ? plan.createdAt : Date.now();
    return [
      {
        id: plan.id,
        name: plan.name,
        date: plan.date,
        items: normalizeSetlist(plan.items),
        createdAt,
        updatedAt:
          typeof plan.updatedAt === "number" ? plan.updatedAt : createdAt,
      },
    ];
  });
}

const initialSetlist = normalizeSetlist(local.get<unknown[]>("setlist", []));
const initialPlanDraft = local.get<{
  id: string | null;
  name: string;
  date: string;
}>("planDraft", {
  id: null,
  name: "",
  date: "",
});
const initialSavedPlans = normalizeSavedPlans(
  local.get<unknown[]>("servicePlans", []),
);
const initialSavedPlan = initialSavedPlans.find(
  (plan) => plan.id === initialPlanDraft.id,
);
const comparableItems = (items: SetlistItem[]) =>
  items.map(({ uid: itemUid, ...item }) => {
    void itemUid;
    return item;
  });
const initialPlanDirty =
  initialSetlist.length > 0 &&
  (!initialSavedPlan ||
    initialSavedPlan.name !== initialPlanDraft.name ||
    initialSavedPlan.date !== initialPlanDraft.date ||
    JSON.stringify(comparableItems(initialSavedPlan.items)) !==
      JSON.stringify(comparableItems(initialSetlist)));

export const useApp = create<State & Actions>((set, get) => ({
  endRevision: 0,
  endPresentation() {
    local.set("console-session", null);
    set({
      preview: null,
      previewUid: null,
      liveContent: null,
      liveFrame: null,
      liveBible: [],
      hymnId: null,
      hymnUid: null,
      liveHymnId: null,
      passage: null,
      activeUid: null,
      playing: false,
      blank: false,
      seek: null,
      retryAt: 0,
      notice: null,
      player: { ...emptyPlayer, activated: get().player.activated },
      endRevision: get().endRevision + 1,
    });
  },
  preview: null,
  previewUid: null,
  liveContent: null,
  liveFrame: null,
  favorites: local.get<unknown[]>("favorites", []).filter(isContent),
  recent: local.get<unknown[]>("recent", []).filter(isContent),
  simpleMode: local.get("simpleMode", false),
  notice: null,
  retryAt: 0,
  liveBible: [],
  retryVideo() {
    set({
      retryAt: Date.now(),
      player: { ...emptyPlayer, activated: get().player.activated },
    });
  },

  prepare(content, itemUid = null) {
    const copy = structuredClone(content);
    set({
      preview: copy,
      previewUid: itemUid,
      hymnId: content.kind === "hymn" ? content.hymnId : null,
      hymnUid: itemUid,
    });
  },

  take() {
    const s = get();
    if (!s.preview) return;
    const content = structuredClone(s.preview);
    const frame = resolveContent(content, s.bible, s.videos, s.passageStyle);
    if (
      !frame ||
      (frame.kind === "video" && !frame.videoId) ||
      (frame.kind === "passage" && !frame.verses.length)
    )
      return;
    const recent = [
      content,
      ...s.recent.filter((item) => contentKey(item) !== contentKey(content)),
    ].slice(0, 30);
    local.set("recent", recent);
    set({
      liveContent: content,
      liveFrame: frame,
      activeUid: s.previewUid,
      liveBible: s.bible,
      liveHymnId: content.kind === "hymn" ? content.hymnId : null,
      passage: content.kind === "passage" ? content.ref : null,
      playing: false,
      seek: null,
      recent,
      player: { ...emptyPlayer, activated: s.player.activated },
    });
  },

  stepLive(delta) {
    const s = get();
    const bible = s.liveBible.length ? s.liveBible : s.bible;
    const next = adjacentContent(s.liveContent, delta, bible);
    if (!next) return;
    set({
      liveContent: next,
      liveFrame: resolveContent(
        next,
        bible,
        s.videos,
        s.liveFrame?.kind === "passage" ? s.liveFrame.style : s.passageStyle,
      ),
      passage: next.kind === "passage" ? next.ref : null,
    });
  },

  prepareItem(item) {
    if (item.type === "content") get().prepare(item.content, item.uid);
    if (item.type === "hymn") get().openHymn(item.hymnId, item.uid);
    if (item.type === "passage") {
      const ref = {
        book: item.book,
        chapter: item.chapter,
        verseStart: item.verseStart,
        verseEnd: item.verseStart,
      };
      get().prepare(
        { kind: "passage", title: passageReference(get().bible, ref), ref },
        item.uid,
      );
    }
    if (item.type === "label") set({ activeUid: item.uid });
  },

  addContent(content) {
    const setlist: SetlistItem[] = [
      ...get().setlist,
      { uid: uid(), type: "content", content: structuredClone(content) },
    ];
    local.set("setlist", setlist);
    set({ setlist, undoSetlist: get().setlist, planDirty: true });
  },

  toggleFavorite(content) {
    const key = contentKey(content);
    const favorites = get().favorites.some((item) => contentKey(item) === key)
      ? get().favorites.filter((item) => contentKey(item) !== key)
      : [...get().favorites, structuredClone(content)];
    local.set("favorites", favorites);
    set({ favorites });
  },

  setSimpleMode(simpleMode) {
    local.set("simpleMode", simpleMode);
    set({ simpleMode });
  },

  controlTimer(action, target) {
    const item = target === "preview" ? get().preview : get().liveContent;
    if (item?.kind !== "timer") return;
    const remaining = action === "reset" ? item.duration : timerSeconds(item);
    const next: Content = {
      ...item,
      remaining,
      endsAt: action === "start" ? Date.now() + remaining * 1000 : null,
    };
    if (target === "preview") set({ preview: next });
    else
      set({
        liveContent: next,
        liveFrame: resolveContent(
          next,
          get().bible,
          get().videos,
          get().passageStyle,
        ),
      });
  },
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
  bibleError: null,

  setlist: initialSetlist,
  savedPlans: initialSavedPlans,
  currentPlanId: initialPlanDraft.id,
  planName: initialPlanDraft.name,
  planDate: initialPlanDraft.date,
  planDirty: initialPlanDirty,
  undoSetlist: null,
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
    set({ loading: true, error: null });
    try {
      const [hymnal, videos] = await Promise.all([
        loadHymnal((fresh) => set({ hymns: fresh.hymns })),
        loadVideoMap(),
      ]);
      set({ hymns: hymnal.hymns, videos, loading: false });
    } catch (error) {
      console.error("Falha ao carregar o hinário.", error);
      set({
        loading: false,
        error:
          "Verifique a conexão e os arquivos de dados, depois tente novamente.",
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
    set({ bibleVersion: version, bibleLoading: true, bibleError: null });
    try {
      const bible = await loadBible(version, (fresh) => {
        if (get().bibleVersion === version) set({ bible: fresh.books });
      });
      if (get().bibleVersion === version)
        set({ bible: bible.books, bibleLoading: false });
    } catch (error) {
      // Sem public/data/biblia-<versão>.json (ex: `npm run import:bible` não rodou ainda).
      console.error(`Falha ao carregar a Bíblia (${version}).`, error);
      if (get().bibleVersion === version) {
        set({
          bibleLoading: false,
          bibleError: "Verifique a conexão ou os arquivos desta tradução.",
        });
      }
    }
  },

  openHymn(id, itemUid = null) {
    // Só seleciona (busca/roteiro): olhar um hino não pode mexer no que já está no ar.
    // O ar só muda com commitLive (Tocar, duplo clique, próximo/anterior).
    const hymn = get().hymn(id);
    if (hymn) get().prepare(hymnContent(hymn), itemUid);
    else set({ hymnId: id, hymnUid: itemUid });
  },

  commitLive() {
    if (get().preview) {
      get().take();
      return;
    }
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
    const preview = get().preview;
    if (!preview) return;
    if (preview.kind === "media") {
      try {
        if (!(await readAsset(preview.assetIds[preview.slide]))) {
          set({
            notice:
              "Arquivo não encontrado. Importe a apresentação novamente antes de colocá-la no ar.",
          });
          return;
        }
      } catch {
        set({
          notice:
            "Não foi possível abrir este arquivo. O conteúdo anterior continua no ar.",
        });
        return;
      }
      if (get().preview !== preview) return;
    }
    get().take();
    if (!get().displayOpen) await get().openDisplay();
  },

  stepHymn(delta) {
    // Etapas da programação sem hino (ex: "Oração") não têm o que projetar, então
    // navegar pelo teclado pula direto para o próximo/anterior hino da lista, sempre no ar
    // (é um controle de show, não uma busca).
    const hymnItems = get().setlist.filter(
      (item): item is Extract<SetlistItem, { type: "hymn" }> =>
        item.type === "hymn",
    );
    if (hymnItems.length === 0) return;
    const { activeUid } = get();
    const current = hymnItems.findIndex((item) => item.uid === activeUid);
    const next =
      hymnItems[Math.min(Math.max(current + delta, 0), hymnItems.length - 1)];
    if (!next || next.uid === activeUid) return;
    get().openHymn(next.hymnId, next.uid);
    get().commitLive();
  },

  openPassage(ref, itemUid = null) {
    // Passagem substitui o vídeo na tela; o hino fica pausado até o operador voltar a ele.
    // Já é uma ação explícita de "botar no ar" (botão Projetar / duplo clique no roteiro).
    const passageRef: PassageRef = {
      book: ref.book,
      chapter: ref.chapter,
      verseStart: ref.verseStart,
      verseEnd: ref.verseEnd,
    };
    set({
      liveContent: null,
      liveFrame: null,
      passage: clampPassage(get().bible, passageRef) ?? passageRef,
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
    if (get().liveContent?.kind === "passage") {
      get().stepLive(delta);
      return;
    }
    const next = moveVerse(bible, passage, delta);
    if (next) set({ passage: next });
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
    else if (
      get().liveFrame?.kind === "video" ||
      get().videoOf(get().liveHymnId)
    ) {
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
    local.set("videos", {
      ...local.get<VideoMap>("videos", {}),
      [String(hymnId)]: videoId,
    });
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
    set({
      videos,
      playing: hymnId === get().liveHymnId ? false : get().playing,
    });
  },

  /** Baixa o mapa completo para virar public/data/videos.json no projeto. */
  exportVideos() {
    const blob = new Blob([JSON.stringify(get().videos, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "videos.json";
    link.click();
    URL.revokeObjectURL(url);
  },

  addToSetlist(id) {
    const setlist: SetlistItem[] = [
      ...get().setlist,
      { uid: uid(), type: "hymn", hymnId: id },
    ];
    local.set("setlist", setlist);
    set({ setlist, undoSetlist: get().setlist, planDirty: true });
  },

  addPassageToSetlist(ref) {
    const setlist: SetlistItem[] = [
      ...get().setlist,
      { uid: uid(), type: "passage", ...ref },
    ];
    local.set("setlist", setlist);
    set({ setlist, undoSetlist: get().setlist, planDirty: true });
  },

  addLabelToSetlist(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const setlist: SetlistItem[] = [
      ...get().setlist,
      { uid: uid(), type: "label", text: trimmed },
    ];
    local.set("setlist", setlist);
    set({ setlist, undoSetlist: get().setlist, planDirty: true });
  },

  renameSetlistLabel(itemUid, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const setlist = get().setlist.map((item): SetlistItem =>
      item.uid === itemUid && item.type === "label"
        ? { ...item, text: trimmed }
        : item,
    );
    local.set("setlist", setlist);
    set({ setlist, undoSetlist: get().setlist, planDirty: true });
  },

  setSetlistItemNote(itemUid, note) {
    const trimmed = note.trim();
    const setlist = get().setlist.map((item): SetlistItem => {
      if (item.uid !== itemUid) return item;
      const next = { ...item };
      if (trimmed) next.note = trimmed;
      else delete next.note;
      return next;
    });
    local.set("setlist", setlist);
    set({ setlist, undoSetlist: get().setlist, planDirty: true });
  },

  duplicateSetlistItem(itemUid) {
    const index = get().setlist.findIndex((item) => item.uid === itemUid);
    if (index < 0) return;
    const setlist = [...get().setlist];
    setlist.splice(index + 1, 0, { ...setlist[index], uid: uid() });
    local.set("setlist", setlist);
    set({ setlist, undoSetlist: get().setlist, planDirty: true });
  },

  /** Acrescenta as etapas do modelo (culto de sábado, escola sabatina, ...) ao roteiro atual. */
  loadSetlistTemplate(template) {
    const items: SetlistItem[] = template.items.map((text) => ({
      uid: uid(),
      type: "label",
      text,
    }));
    const setlist = [...get().setlist, ...items];
    local.set("setlist", setlist);
    set({ setlist, undoSetlist: get().setlist, planDirty: true });
  },

  removeFromSetlist(itemUid) {
    const setlist = get().setlist.filter((item) => item.uid !== itemUid);
    local.set("setlist", setlist);
    set({
      setlist,
      undoSetlist: get().setlist,
      planDirty: true,
      activeUid: get().activeUid === itemUid ? null : get().activeUid,
    });
  },

  reorderSetlist(items) {
    local.set("setlist", items);
    set({ setlist: items, undoSetlist: get().setlist, planDirty: true });
  },

  clearSetlist() {
    local.set("setlist", []);
    set({
      setlist: [],
      undoSetlist: get().setlist,
      planDirty: true,
      activeUid: null,
    });
  },

  undoSetlistChange() {
    const previous = get().undoSetlist;
    if (!previous) return;
    local.set("setlist", previous);
    set({
      setlist: previous,
      undoSetlist: null,
      planDirty: true,
      activeUid: null,
    });
  },

  setPlanDetails(name, date) {
    local.set("planDraft", { id: get().currentPlanId, name, date });
    set({ planName: name, planDate: date, planDirty: true });
  },

  saveServicePlan() {
    const name = get().planName.trim();
    if (!name || get().setlist.length === 0) return false;
    const now = Date.now();
    const existing = get().savedPlans.find(
      (plan) => plan.id === get().currentPlanId,
    );
    const plan: SavedServicePlan = {
      id: existing?.id ?? uid(),
      name,
      date: get().planDate,
      items: get().setlist.map((item) => ({ ...item })),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const savedPlans = existing
      ? get().savedPlans.map((candidate) =>
          candidate.id === plan.id ? plan : candidate,
        )
      : [plan, ...get().savedPlans];
    local.set("servicePlans", savedPlans);
    local.set("planDraft", { id: plan.id, name: plan.name, date: plan.date });
    set({
      savedPlans,
      currentPlanId: plan.id,
      planName: plan.name,
      planDirty: false,
    });
    return true;
  },

  loadServicePlan(id) {
    const plan = get().savedPlans.find((candidate) => candidate.id === id);
    if (!plan) return;
    const setlist = copyItems(plan.items);
    local.set("setlist", setlist);
    local.set("planDraft", { id: plan.id, name: plan.name, date: plan.date });
    set({
      setlist,
      undoSetlist: get().setlist,
      currentPlanId: plan.id,
      planName: plan.name,
      planDate: plan.date,
      planDirty: false,
      activeUid: null,
      hymnUid: null,
    });
  },

  duplicateServicePlan(id) {
    const source = get().savedPlans.find((plan) => plan.id === id);
    if (!source) return;
    const now = Date.now();
    const copy: SavedServicePlan = {
      ...source,
      id: uid(),
      name: `${source.name} — cópia`,
      items: copyItems(source.items),
      createdAt: now,
      updatedAt: now,
    };
    const savedPlans = [copy, ...get().savedPlans];
    local.set("servicePlans", savedPlans);
    set({ savedPlans });
  },

  deleteServicePlan(id) {
    const savedPlans = get().savedPlans.filter((plan) => plan.id !== id);
    local.set("servicePlans", savedPlans);
    const deletingCurrent = get().currentPlanId === id;
    if (deletingCurrent) {
      local.set("planDraft", {
        id: null,
        name: get().planName,
        date: get().planDate,
      });
    }
    set({
      savedPlans,
      currentPlanId: deletingCurrent ? null : get().currentPlanId,
      planDirty: deletingCurrent ? true : get().planDirty,
    });
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
    if (!opened) {
      set({
        notice:
          "O navegador bloqueou a janela. Permita pop-ups para abrir a projeção.",
      });
      return false;
    }
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
