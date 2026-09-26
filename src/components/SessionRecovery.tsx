import { useEffect, useState } from "react";
import { useApp } from "@/store/useApp";
import { isContent, resolveContent, timerSeconds, type Content } from "@/lib/content";
import { local } from "@/lib/storage";
import { Button } from "./ui/button";

type Session = {
  version: 1;
  preview: Content | null;
  live: Content | null;
  activeUid: string | null;
  previewUid: string | null;
};
const paused = (content: Content | null): Content | null =>
  content?.kind === "timer" ? { ...content, remaining: timerSeconds(content), endsAt: null } : content;
export function SessionRecovery() {
  const bibleLoading = useApp((s) => s.bibleLoading);
  const [pending, setPending] = useState<Session | null>(() => {
    const stored = local.get<Session | null>("console-session", null);
    return stored?.version === 1 &&
      (isContent(stored.preview) || isContent(stored.live))
      ? stored
      : null;
  });
  useEffect(() => {
    const save = () => {
      const s = useApp.getState();
      local.set("console-session", {
        version: 1,
        preview: s.preview,
        live: s.liveContent,
        activeUid: s.activeUid,
        previewUid: s.previewUid,
      });
    };
    const unsubscribe = useApp.subscribe((s, previous) => {
      if (
        s.preview !== previous.preview ||
        s.liveContent !== previous.liveContent ||
        s.activeUid !== previous.activeUid ||
        s.endRevision !== previous.endRevision
      ) {
        save();
        if (pending) setPending(null);
      }
    });
    const onHide = () => {
      if (!pending) save();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      unsubscribe();
      window.removeEventListener("pagehide", onHide);
    };
  }, [pending]);
  if (!pending) return null;
  return (
    <div className="session-notice" role="status">
      <span>
        Encontramos uma sessão anterior. Restaurar mantém a tela apagada e o
        vídeo pausado.
      </span>
      <Button
        size="sm"
        disabled={bibleLoading}
        onClick={() => {
          const s = useApp.getState(),
            live = isContent(pending.live) ? paused(pending.live) : null,
            preview = isContent(pending.preview)
              ? paused(pending.preview)
              : null;
          useApp.setState({
            preview,
            liveContent: live,
            liveFrame: resolveContent(live, s.bible, s.videos, s.passageStyle),
            liveBible: s.bible,
            activeUid: pending.activeUid,
            previewUid: pending.previewUid,
            blank: true,
            playing: false,
          });
          setPending(null);
        }}
      >
        Restaurar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          local.set("console-session", null);
          setPending(null);
        }}
      >
        Descartar sessão
      </Button>
    </div>
  );
}
