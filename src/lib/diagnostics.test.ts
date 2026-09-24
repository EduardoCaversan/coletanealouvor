import { afterEach, describe, expect, it, vi } from "vitest";
import { createChannel, type ChannelMessage } from "@/lib/channel";
import { checkDisplayHandshake, checkLocalStorageAvailable, inspectSetlist } from "@/lib/diagnostics";
import type { BibleBook, Hymn } from "@/lib/types";

const hymns: Hymn[] = [
  { id: 1, number: 1, title: "Hino um", search: "hino um" },
  { id: 2, number: 2, title: "Hino dois", search: "hino dois" },
];

const bible: BibleBook[] = [
  { abbrev: "jo", name: "João", search: "joao", testament: "nt", chapters: [["No princípio"]] },
];

afterEach(() => vi.unstubAllGlobals());

describe("inspectSetlist", () => {
  it("reports missing media and invalid references without blocking operation", () => {
    const check = inspectSetlist({
      hymns,
      bible,
      videos: { "1": "abcdefghijk" },
      setlist: [
        { uid: "a", type: "hymn", hymnId: 2 },
        { uid: "b", type: "passage", book: "jo", chapter: 2, verseStart: 1, verseEnd: 1 },
      ],
    });

    expect(check.status).toBe("warning");
    expect(check.message).toContain("hino 2 sem vídeo");
    expect(check.message).toContain("passagem bíblica inválida");
  });

  it("returns OK for a valid prepared setlist", () => {
    const check = inspectSetlist({
      hymns,
      bible,
      videos: { "1": "abcdefghijk" },
      setlist: [
        { uid: "a", type: "hymn", hymnId: 1 },
        { uid: "b", type: "passage", book: "jo", chapter: 1, verseStart: 1, verseEnd: 1 },
      ],
    });

    expect(check.status).toBe("ok");
  });
});

describe("storage and communication checks", () => {
  it("verifies a localStorage round trip", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => values.set(key, value),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
    });

    expect(checkLocalStorageAvailable().status).toBe("ok");
    expect(values.size).toBe(0);
  });

  it("uses a one-shot ping/pong without changing projection state", async () => {
    class FakeBroadcastChannel {
      static instances: FakeBroadcastChannel[] = [];
      onmessage: ((event: { data: ChannelMessage }) => void) | null = null;
      constructor(public name: string) {
        FakeBroadcastChannel.instances.push(this);
      }
      postMessage(message: ChannelMessage) {
        for (const instance of FakeBroadcastChannel.instances) {
          if (instance !== this && instance.name === this.name) instance.onmessage?.({ data: message });
        }
      }
      close() {
        FakeBroadcastChannel.instances = FakeBroadcastChannel.instances.filter((instance) => instance !== this);
      }
    }

    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    let display!: ReturnType<typeof createChannel>;
    display = createChannel((message) => {
      if (message.type === "health-ping") display.post({ type: "health-pong", id: message.id });
    });

    await expect(checkDisplayHandshake(50)).resolves.toMatchObject({ status: "ok" });
    display.close();
  });

  it("reports a missing display after the bounded timeout", async () => {
    class SilentBroadcastChannel {
      onmessage: ((event: { data: ChannelMessage }) => void) | null = null;
      postMessage() {}
      close() {}
    }
    vi.stubGlobal("BroadcastChannel", SilentBroadcastChannel);
    vi.stubGlobal("window", { setTimeout, clearTimeout });

    await expect(checkDisplayHandshake(5)).resolves.toMatchObject({ status: "warning" });
  });
});
