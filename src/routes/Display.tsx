import { useCallback, useEffect, useRef, useState } from "react";
import { createChannel } from "@/lib/channel";
import { emptyLive } from "@/lib/useLive";
import type { LiveState, PlayerState } from "@/lib/types";
import { ContentScreen } from "@/components/ContentScreen";

import { loadYouTubeApi, type YTPlayer } from "@/lib/youtubePlayer";

const erros: Record<number, string> = {
  2: "Id de vídeo inválido.",
  5: "O player não conseguiu reproduzir este vídeo.",
  100: "Vídeo não encontrado ou removido.",
  101: "O dono do vídeo não permite reprodução incorporada.",
  150: "O dono do vídeo não permite reprodução incorporada.",
};

/** Janela de projeção: só o vídeo do hino, sem nenhum controle visível. */
export default function Display() {
  const [live, setLive] = useState<LiveState>(emptyLive);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof createChannel> | null>(null);
  const liveRef = useRef(live);
  const stateRef = useRef({ playing: false, buffering: false, ended: false });
  const activatedRef = useRef(false);
  const readyRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const loadedRef = useRef<string | null>(null);
  liveRef.current = live;

  const report = useCallback((patch: Partial<PlayerState> = {}) => {
    const player = playerRef.current;
    const state: PlayerState = {
      ready: readyRef.current,
      activated: activatedRef.current,
      playing: stateRef.current.playing,
      buffering: stateRef.current.buffering,
      ended: stateRef.current.ended,
      currentTime: readyRef.current ? (player?.getCurrentTime() ?? 0) : 0,
      duration: readyRef.current ? (player?.getDuration() ?? 0) : 0,
      error: errorRef.current,
      updatedAt: Date.now(),
      ...patch,
    };
    channelRef.current?.post({ type: "player", state });
  }, []);

  // Canal com a janela de controle.
  useEffect(() => {
    const channel = createChannel((message) => {
      if (message.type === "state") {
        setLive((current) =>
          message.state.updatedAt >= current.updatedAt
            ? message.state
            : current,
        );
      }
      if (message.type === "hello") channel.post({ type: "display-open" });
      if (message.type === "health-ping")
        channel.post({ type: "health-pong", id: message.id });
    });

    channelRef.current = channel;
    channel.post({ type: "display-open" });

    const bye = () => channel.post({ type: "display-closed" });
    window.addEventListener("pagehide", bye);
    return () => {
      bye();
      window.removeEventListener("pagehide", bye);
      channel.close();
    };
  }, []);

  const needsVideo = !!live.videoId;
  useEffect(() => {
    if (!needsVideo) return;
    let cancelled = false;
    readyRef.current = false;
    setReady(false);
    errorRef.current = null;
    setError(null);
    loadedRef.current = null;
    const element = document.createElement("div");
    mountRef.current?.append(element);

    void loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        playerRef.current = new YT.Player(element, {
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            fs: 0,
          },
          events: {
            onReady: () => {
              readyRef.current = true;
              if (activatedRef.current) playerRef.current?.unMute();
              setReady(true);
              report({ ready: true });
            },
            onStateChange: (event) => {
              stateRef.current = {
                playing: event.data === YT.PlayerState.PLAYING,
                buffering: event.data === YT.PlayerState.BUFFERING,
                ended: event.data === YT.PlayerState.ENDED,
              };
              report();
            },
            onError: (event) => {
              const message =
                erros[event.data] ??
                "Não foi possível reproduzir este vídeo. Tente novamente.";
              errorRef.current = message;
              setError(message);
              report({ error: message });
            },
          },
        });
      })
      .catch((cause: Error) => {
        if (!cancelled) {
          setError(cause.message);
          errorRef.current = cause.message;
          report({ ready: false, error: cause.message });
        }
      });

    return () => {
      cancelled = true;
      if (readyRef.current) playerRef.current?.stopVideo();
      playerRef.current?.destroy();
      playerRef.current = null;
      readyRef.current = false;
      element.remove();
      stateRef.current = { playing: false, buffering: false, ended: false };
    };
  }, [report, needsVideo, live.retryAt]);

  // Troca de vídeo.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !ready) return;

    if (live.videoId !== loadedRef.current) {
      loadedRef.current = live.videoId;
      setError(null);
      errorRef.current = null;
      stateRef.current = { playing: false, buffering: false, ended: false };
      if (!live.videoId) player.stopVideo();
      // Sem gesto nesta janela o navegador recusa o play; aí só deixamos pronto.
      else if (live.playing && activatedRef.current)
        player.loadVideoById(live.videoId);
      else player.cueVideoById(live.videoId);
      return;
    }

    if (!live.videoId) return;
    if (live.playing && activatedRef.current) player.playVideo();
    if (!live.playing) player.pauseVideo();
  }, [live.videoId, live.playing, ready]);

  // Volume e busca na linha do tempo.
  useEffect(() => {
    if (ready) playerRef.current?.setVolume(Math.round(live.volume * 100));
  }, [live.volume, ready]);

  useEffect(() => {
    if (ready && live.seek) playerRef.current?.seekTo(live.seek.time, true);
  }, [live.seek, ready]);

  // Relatório periódico de posição enquanto toca.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (playerRef.current && readyRef.current) report();
    }, 500);
    return () => clearInterval(timer);
  }, [report]);

  // Teclado da janela de projeção.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const channel = channelRef.current;
      if (!channel) return;
      const key = event.key.toLowerCase();
      if (event.key === " ") {
        event.preventDefault();
        channel.post({ type: "command", action: "toggle" });
      } else if (event.key === "ArrowRight" || event.key === "PageDown") {
        channel.post({ type: "command", action: "next" });
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        channel.post({ type: "command", action: "prev" });
      } else if (key === "b") {
        channel.post({ type: "command", action: "blank" });
      } else if (key === "f") {
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
    } catch {
      // Navegador pode recusar sem gesto do usuário; segue em janela.
    }
  };

  /** Primeiro clique nesta janela: libera o som e entra em tela cheia. */
  const activate = () => {
    activatedRef.current = true;
    setActivated(true);
    const player = playerRef.current;
    if (player && readyRef.current) {
      player.unMute();
      player.setVolume(Math.round(liveRef.current.volume * 100));
      if (liveRef.current.playing) player.playVideo();
    }
    void toggleFullscreen();
    report({ activated: true });
  };

  const covered =
    live.blank || (!live.videoId && !live.passage && !live.content);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden bg-black"
      onDoubleClick={toggleFullscreen}
    >
      <div ref={mountRef} className="absolute inset-0 [&>iframe]:size-full" />

      {live.content && live.content.kind !== "video" && (
        <div className="absolute inset-0">
          <ContentScreen frame={live.content} />
        </div>
      )}

      {live.passage && !live.content && <div className="absolute inset-0"><ContentScreen frame={{ kind: "passage", title: live.passage.reference, verses: live.passage.verses, style: live.passageStyle }} /></div>}

      {/* Tela preta por cima: vídeo/passagem continuam por baixo. */}
      <div
        className={`absolute inset-0 bg-black ${
          covered ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Passagem não tem som: mostra direto, sem pedir o clique de ativação. */}
      {!activated && !!live.videoId && !live.blank && (
        <button
          onClick={activate}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-ink-200"
        >
          <span className="text-2xl font-semibold">
            Clique para ativar o som
          </span>
          <span className="text-sm text-ink-400">
            Uma vez por sessão. Também entra em tela cheia.
          </span>
        </button>
      )}

      {activated && error && !!live.videoId && !live.blank && (
        <div className="absolute inset-x-0 bottom-8 text-center text-sm text-amber-400">
          {error}
        </div>
      )}

      {activated && !error && live.updatedAt === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-ink-400">
          Tela de projeção pronta
        </div>
      )}
    </div>
  );
}
