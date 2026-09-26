import { useEffect, useMemo, useRef } from "react";
import { passageReference, passageVerses } from "@/lib/bible";
import { createChannel, type ChannelMessage } from "@/lib/channel";
import { DEFAULT_PASSAGE_STYLE } from "@/lib/passageStyle";
import { useApp } from "@/store/useApp";
import type { LiveState } from "@/lib/types";

export const emptyLive: LiveState = {
  videoId: null,
  title: "",
  blank: false,
  playing: false,
  volume: 1,
  seek: null,
  passage: null,
  passageStyle: DEFAULT_PASSAGE_STYLE,
  updatedAt: 0,
};

/** Lado do controle: publica o desejo do operador e ouve o player de volta. */
export function useControlLink() {
  // O que está no ar é liveHymnId, não o que o operador tem selecionado/olhando agora.
  const hymn = useApp((state) => state.hymn(state.liveHymnId));
  const frame = useApp((state) => state.liveFrame);
  const retryAt = useApp((state) => state.retryAt);
  const videoId = useApp((state) => state.videoOf(state.liveHymnId));
  const blank = useApp((state) => state.blank);
  const playing = useApp((state) => state.playing);
  const volume = useApp((state) => state.volume);
  const seek = useApp((state) => state.seek);
  const passage = useApp((state) => state.passage);
  const bible = useApp((state) => state.bible);
  const passageStyle = useApp((state) => state.passageStyle);

  const setPlayer = useApp((state) => state.setPlayer);
  const setDisplayOpen = useApp((state) => state.setDisplayOpen);

  const channelRef = useRef<ReturnType<typeof createChannel> | null>(null);

  const passageLive = useMemo(
    () =>
      passage && bible.length
        ? {
            reference: passageReference(bible, passage),
            verses: passageVerses(bible, passage),
          }
        : null,
    [passage, bible],
  );

  const state = useMemo<LiveState>(
    () => ({
      content: frame,
      retryAt,
      videoId: frame
        ? frame.kind === "video"
          ? frame.videoId
          : null
        : videoId,
      title: frame?.title ?? (hymn ? `${hymn.title} (${hymn.number})` : ""),
      blank,
      playing,
      volume,
      seek,
      passage: frame ? null : passageLive,
      passageStyle,
      updatedAt: Date.now(),
    }),
    [
      retryAt,
      frame,
      videoId,
      hymn,
      blank,
      playing,
      volume,
      seek,
      passageLive,
      passageStyle,
    ],
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const channel = createChannel((message: ChannelMessage) => {
      if (message.type === "hello" || message.type === "display-open") {
        setDisplayOpen(true);
        channel.post({ type: "state", state: stateRef.current });
      }
      if (message.type === "display-closed") setDisplayOpen(false);
      if (message.type === "player") setPlayer(message.state);
      if (message.type === "command") {
        const store = useApp.getState();
        if (message.action === "next") {
          if (store.liveContent) store.stepLive(1);
          else if (store.passage) store.movePassageVerses(1);
        }
        if (message.action === "prev") {
          if (store.liveContent) store.stepLive(-1);
          else if (store.passage) store.movePassageVerses(-1);
        }
        if (message.action === "blank") store.setBlank(!store.blank);
        if (message.action === "toggle") {
          if (store.liveContent?.kind === "timer")
            store.controlTimer(
              store.liveContent.endsAt ? "pause" : "start",
              "live",
            );
          else store.toggle();
        }
      }
    });

    channelRef.current = channel;
    channel.post({ type: "hello" });
    return () => channel.close();
  }, [setDisplayOpen, setPlayer]);

  useEffect(() => {
    channelRef.current?.post({ type: "state", state });
  }, [state]);
}
