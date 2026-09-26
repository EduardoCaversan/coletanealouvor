import { beforeEach, describe, expect, it } from "vitest";
import { useApp } from "@/store/useApp";
import {
  adjacentContent,
  resolveContent,
  timerSeconds,
  type Content,
} from "./content";
import { moveVerse, parseReference } from "./bible";
import { drawItems } from "./draw";
import { DEFAULT_PASSAGE_STYLE } from "./passageStyle";
import type { BibleBook } from "./types";

const bible: BibleBook[] = [
  {
    abbrev: "jo",
    name: "João",
    search: "joao",
    testament: "nt",
    chapters: [["a", "b"], ["c"]],
  },
  {
    abbrev: "at",
    name: "Atos",
    search: "atos",
    testament: "nt",
    chapters: [["d", "e"]],
  },
];
beforeEach(() =>
  useApp.setState({
    preview: null,
    liveContent: null,
    liveFrame: null,
    liveBible: [],
    bible,
    favorites: [],
    recent: [],
    blank: false,
    playing: false,
    setlist: [],
  }),
);

describe("universal operation", () => {
  it("ends playback and clears both stages without deleting the service plan or library", () => {
    const content: Content = { kind: "youtube", title: "Hino", videoId: "abcdefghijk" };
    useApp.getState().addContent(content);
    useApp.getState().toggleFavorite(content);
    useApp.getState().prepare(content);
    useApp.getState().take();
    useApp.setState({ playing: true, seek: { time: 25, nonce: 1 }, liveHymnId: 1, hymnId: 1, hymnUid: 'hymn', activeUid: 'hymn' });
    useApp.getState().setBlank(true);
    expect(useApp.getState().playing).toBe(true);
    expect(useApp.getState().liveContent).toEqual(content);
    const { setlist, favorites, recent } = useApp.getState();
    useApp.getState().endPresentation();
    expect(useApp.getState()).toMatchObject({
      preview: null, previewUid: null, liveContent: null, liveFrame: null,
      hymnId: null, hymnUid: null, liveHymnId: null, passage: null,
      activeUid: null, playing: false, blank: false, seek: null,
    });
    expect(useApp.getState().setlist).toBe(setlist);
    expect(useApp.getState().favorites).toBe(favorites);
    expect(useApp.getState().recent).toBe(recent);
    useApp.getState().toggle();
    useApp.getState().stepLive(1);
    expect(useApp.getState().playing).toBe(false);
    expect(useApp.getState().liveFrame).toBeNull();
  });
  it("keeps each prepared content out of Live until take; snapshots exclude private notes", () => {
    const contents: Content[] = [
      { kind: "text", title: "Texto", body: "Mensagem" },
      { kind: "media", title: "Slides", assetIds: ["a", "b"], slide: 0 },
      { kind: "youtube", title: "Vídeo", videoId: "abcdefghijk" },
      {
        kind: "timer",
        title: "Timer",
        duration: 30,
        remaining: 30,
        endsAt: null,
      },
      { kind: "draw", title: "Sorteio", results: ["Ana"] },
      {
        kind: "passage",
        title: "João",
        ref: { book: "jo", chapter: 1, verseStart: 1, verseEnd: 1 },
      },
    ];
    for (const content of contents) {
      const previous = useApp.getState().liveFrame;
      const privateContent = { ...content, note: "PRIVATE" };
      useApp.getState().prepare(privateContent);
      expect(useApp.getState().liveFrame).toBe(previous);
      useApp.getState().take();
      expect(JSON.stringify(useApp.getState().liveFrame)).not.toContain(
        "PRIVATE",
      );
      const current = useApp.getState().liveFrame;
      useApp.getState().setBlank(true);
      expect(useApp.getState().liveFrame).toBe(current);
    }
  });
  it("navigates live slides without changing a separately prepared text", () => {
    const slides: Content = {
      kind: "media",
      title: "Sermão",
      assetIds: ["a", "b"],
      slide: 0,
    };
    useApp.getState().prepare(slides);
    useApp.getState().take();
    useApp.getState().prepare({ kind: "text", title: "Próximo", body: "Fim" });
    useApp.getState().stepLive(1);
    expect(useApp.getState().liveFrame).toMatchObject({ assetId: "b" });
    expect(useApp.getState().preview?.title).toBe("Próximo");
    expect(adjacentContent({ ...slides, slide: 1 }, 1, bible)).toBeNull();
  });
  it("preserves live translation and appearance while browsing a different Bible", () => {
    useApp
      .getState()
      .prepare({
        kind: "passage",
        title: "João",
        ref: { book: "jo", chapter: 1, verseStart: 1, verseEnd: 1 },
      });
    useApp.getState().take();
    useApp.setState({
      bible: [{ ...bible[0], chapters: [["changed"]] }],
      passageStyle: { ...DEFAULT_PASSAGE_STYLE, color: "#ff0000" },
    });
    useApp.getState().stepLive(1);
    expect(useApp.getState().liveFrame).toMatchObject({
      verses: [{ number: 2, text: "b" }],
      style: DEFAULT_PASSAGE_STYLE,
    });
  });
  it("stores universal content in service plans without projecting it", () => {
    useApp
      .getState()
      .addContent({ kind: "text", title: "Abertura", body: "Bem-vindos" });
    useApp.getState().setPlanDetails("Culto", "");
    useApp.getState().saveServicePlan();
    const plan = useApp.getState().savedPlans[0];
    useApp.getState().clearSetlist();
    useApp.getState().loadServicePlan(plan.id);
    expect(useApp.getState().setlist[0]).toMatchObject({
      type: "content",
      content: { body: "Bem-vindos" },
    });
    expect(useApp.getState().liveFrame).toBeNull();
  });
});

describe("continuous Bible, timer and draw", () => {
  it("crosses chapters and books both ways and stops only at the Bible boundary", () => {
    const ref = { book: "jo", chapter: 1, verseStart: 2, verseEnd: 2 };
    const next = moveVerse(bible, ref, 1)!;
    expect(next).toMatchObject({ chapter: 2, verseStart: 1 });
    expect(moveVerse(bible, next, -1)).toEqual(ref);
    expect(moveVerse(bible, next, 1)).toMatchObject({
      book: "at",
      chapter: 1,
      verseStart: 1,
    });
    expect(
      moveVerse(bible, { ...ref, verseStart: 1, verseEnd: 1 }, -1),
    ).toBeNull();
    expect(parseReference(bible, "João 1:1–2")).toMatchObject({ verseEnd: 2 });
    expect(parseReference(bible, "João 1:99")).toBeNull();
  });
  it("calculates countdown from deadline without interval drift and keeps private timer private", () => {
    const timer: Content = {
      kind: "timer",
      title: "Início",
      duration: 60,
      remaining: 60,
      endsAt: 120000,
    };
    expect(timerSeconds(timer, 65000)).toBe(55);
    expect(timerSeconds(timer, 130000)).toBe(0);
    useApp.getState().prepare(timer);
    useApp.getState().controlTimer("reset", "preview");
    expect(useApp.getState().liveFrame).toBeNull();
    expect(
      resolveContent(useApp.getState().preview, [], {}, DEFAULT_PASSAGE_STYLE),
    ).toMatchObject({ endsAt: null, remaining: 60 });
  });
  it("draws unique values excluding history and rejects impossible requests", () => {
    expect(
      new Set(drawItems(["Ana", "Pedro", "Maria", "Ana"], 2, true, ["Ana"])),
    ).toEqual(new Set(["Pedro", "Maria"]));
    expect(() => drawItems(["Ana"], 2, true, [])).toThrow();
    expect(drawItems(["Ana"], 3, false, [])).toEqual(["Ana", "Ana", "Ana"]);
  });
});
