import { beforeEach, describe, expect, it } from "vitest";
import { useApp } from "@/store/useApp";
import type { Hymn, SetlistItem } from "@/lib/types";

const hymns: Hymn[] = [
  { id: 1, number: 1, title: "Primeiro", search: "primeiro" },
  { id: 2, number: 2, title: "Segundo", search: "segundo" },
];

const setlist: SetlistItem[] = [
  { uid: "first", type: "hymn", hymnId: 1 },
  { uid: "label", type: "label", text: "Oração" },
  { uid: "second", type: "hymn", hymnId: 2 },
];

beforeEach(() => {
  useApp.setState({
    hymns,
    videos: { "1": "abcdefghijk", "2": "lmnopqrstuv" },
    setlist,
    activeUid: "first",
    hymnId: 1,
    hymnUid: "first",
    liveHymnId: 1,
    passage: null,
    playing: false,
    blank: false,
  });
});

describe("live invariants", () => {
  it("selecting another hymn changes preview but not Live", () => {
    useApp.getState().openHymn(2, "second");

    expect(useApp.getState().hymnId).toBe(2);
    expect(useApp.getState().liveHymnId).toBe(1);
    expect(useApp.getState().activeUid).toBe("first");
  });

  it("moves Live only after an explicit commit", () => {
    useApp.getState().openHymn(2, "second");
    useApp.getState().commitLive();

    expect(useApp.getState().liveHymnId).toBe(2);
    expect(useApp.getState().activeUid).toBe("second");
  });

  it("steps over labels to the next projectable hymn", () => {
    useApp.getState().stepHymn(1);

    expect(useApp.getState().liveHymnId).toBe(2);
    expect(useApp.getState().activeUid).toBe("second");
  });

  it("blackout does not destroy the current Live selection", () => {
    useApp.getState().setBlank(true);

    expect(useApp.getState().blank).toBe(true);
    expect(useApp.getState().liveHymnId).toBe(1);
  });
});
