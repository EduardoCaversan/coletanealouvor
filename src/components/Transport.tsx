import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Pause,
  Play,
  Radio,
  Send,
  Star,
  Square,
} from "lucide-react";
import { useApp } from "@/store/useApp";
import { adjacentContent, contentKey, resolveContent } from "@/lib/content";
import { ContentScreen, AssetImage } from "./ContentScreen";
import { Button } from "./ui/button";
import { VideoLink } from "./VideoLink";
import { formatDuration } from "@/lib/utils";
import { passageReference } from "@/lib/bible";
import { VideoMonitor } from "./VideoMonitor";

export function Transport() {
  const preview = useApp((s) => s.preview),
    live = useApp((s) => s.liveContent),
    frame = useApp((s) => s.liveFrame);
  const bible = useApp((s) => s.bible),
    videos = useApp((s) => s.videos),
    style = useApp((s) => s.passageStyle);
  const blank = useApp((s) => s.blank),
    playing = useApp((s) => s.playing),
    player = useApp((s) => s.player);
  const displayOpen = useApp((s) => s.displayOpen),
    volume = useApp((s) => s.volume),
    simple = useApp((s) => s.simpleMode);
  const setlist = useApp((s) => s.setlist),
    activeUid = useApp((s) => s.activeUid),
    liveBible = useApp((s) => s.liveBible);
  const nextItem = setlist[setlist.findIndex((i) => i.uid === activeUid) + 1];
  const nextTitle =
    nextItem?.type === "label"
      ? nextItem.text
      : nextItem?.type === "content"
        ? nextItem.content.title
        : nextItem?.type === "hymn"
          ? useApp.getState().hymn(nextItem.hymnId)?.title
          : nextItem?.type === "passage"
            ? passageReference(bible, nextItem)
            : null;
  const favorites = useApp((s) => s.favorites);
  const preparedFrame = resolveContent(preview, bible, videos, style);
  const liveBooks = liveBible.length ? liveBible : bible;
  const previous = adjacentContent(live, -1, liveBooks),
    next = adjacentContent(live, 1, liveBooks);
  const preparedPrevious = adjacentContent(preview, -1, bible),
    preparedNext = adjacentContent(preview, 1, bible);
  const canTake =
    !!preparedFrame &&
    !(preparedFrame.kind === "video" && !preparedFrame.videoId) &&
    !(preparedFrame.kind === "passage" && !preparedFrame.verses.length);
  const s = useApp.getState();
  const favorite =
    preview && favorites.some((i) => contentKey(i) === contentKey(preview));
  return (
    <section className="operation-panel">
      <div className="monitor-grid">
        <section className="monitor live-monitor" data-testid="live-monitor">
          <header>
            <span>
              <Radio size={14} />
              LIVE · NO AR
            </span>
            <span>
              {blank
                ? "TELA APAGADA"
                : !displayOpen
                  ? "Projeção fechada"
                  : !frame
                    ? "Sem transmissão"
                    : playing
                    ? "Reproduzindo"
                    : "Projeção conectada"}
            </span>
          </header>
          <div className="monitor-screen">
            {frame?.kind === "video" && frame.videoId && !simple ? (
              <VideoMonitor videoId={frame.videoId} blank={blank} />
            ) : (
              <ContentScreen frame={frame} blank={blank || !frame} />
            )}
          </div>
          <div className="monitor-caption">
            {live?.title ?? "Nenhum conteúdo no ar"}
            {live?.kind === "media" && (
              <span>
                Slide {live.slide + 1} / {live.assetIds.length}
              </span>
            )}
          </div>
          {frame?.kind === "video" && (
            <p className="hint px-3">
              {simple
                ? "Capa do vídeo"
                : "Monitor sem som · sincronização aproximada"}{" "}
              · {formatDuration(player.currentTime)} /{" "}
              {formatDuration(player.duration)}
            </p>
          )}
        </section>
        <section
          className="monitor preview-monitor"
          data-testid="preview-monitor"
        >
          <header>
            <span>PREVIEW · PREPARADO</span>
            {preview && (
              <button
                aria-label={
                  favorite ? "Remover favorito" : "Favoritar preparado"
                }
                onClick={() => s.toggleFavorite(preview)}
              >
                <Star size={14} fill={favorite ? "currentColor" : "none"} />
              </button>
            )}
          </header>
          <div className="monitor-screen">
            <ContentScreen frame={preparedFrame} />
          </div>
          <div className="monitor-caption">
            {preview?.title ?? "Busque ou selecione um item"}
            {preview?.kind === "media" && (
              <span>
                Slide {preview.slide + 1} / {preview.assetIds.length}
              </span>
            )}
          </div>
          <div className="preview-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={!preparedPrevious}
              onClick={() =>
                preparedPrevious && s.prepare(preparedPrevious, s.previewUid)
              }
              aria-label="Anterior no Preview"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="hint">Preparar não altera o telão</span>
            <Button
              variant="ghost"
              size="sm"
              disabled={!preparedNext}
              onClick={() =>
                preparedNext && s.prepare(preparedNext, s.previewUid)
              }
              aria-label="Próximo no Preview"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </section>
      </div>
      <div className="live-transport" aria-label="Controles ao vivo">
        <Button
          variant="secondary"
          disabled={!previous}
          onClick={() => s.stepLive(-1)}
          title="Anterior no ar (←)"
        >
          <ChevronLeft size={18} />
          Anterior
        </Button>
        <Button
          variant="secondary"
          disabled={frame?.kind !== "video" && live?.kind !== "timer"}
          onClick={() =>
            live?.kind === "timer"
              ? s.controlTimer(live.endsAt ? "pause" : "start", "live")
              : s.toggle()
          }
          title="Tocar / pausar (Espaço)"
        >
          {playing || (live?.kind === "timer" && live.endsAt) ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}
          {playing || (live?.kind === "timer" && live.endsAt)
            ? "Pausar"
            : "Iniciar"}
        </Button>
        <Button
          className="take-button"
          disabled={!canTake}
          onClick={() => void s.putOnAir()}
          title="Colocar Preview no ar (Enter)"
        >
          <Send size={18} />
          Colocar no ar
        </Button>
        <Button
          variant="secondary"
          disabled={!next}
          onClick={() => s.stepLive(1)}
          title="Próximo no ar (→)"
        >
          Próximo
          <ChevronRight size={18} />
        </Button>
        <Button
          variant={blank ? "danger" : "outline"}
          onClick={() => s.setBlank(!blank)}
          title="Tela preta preserva o conteúdo e não silencia o áudio (B)"
        >
          <EyeOff size={18} />
          {blank ? "Restaurar tela" : "Apagar tela"}
        </Button>
        <Button
          variant="outline"
          className="border-red-400/60 text-red-300"
          onClick={() => {
            if (window.confirm("Encerrar a apresentação? A reprodução será interrompida e Live/Preview serão limpos. Seu roteiro e arquivos continuam salvos.")) s.endPresentation();
          }}
          title="Parar tudo, limpar Live e Preview e voltar ao estado neutro"
        >
          <Square size={18} />
          Encerrar
        </Button>
      </div>
      {blank && (
        <p className="blackout-notice">
          Blackout ativo. O conteúdo foi preservado; o áudio continua se estiver
          tocando.
        </p>
      )}
      {frame?.kind === "video" && (
        <div className="video-controls">
          <label>
            Posição
            <input
              aria-label="Posição do vídeo"
              type="range"
              min={0}
              max={player.duration || 1}
              value={Math.min(player.currentTime, player.duration || 1)}
              step={1}
              disabled={!player.duration}
              onChange={(e) => s.seekTo(Number(e.target.value))}
            />
          </label>
          <label>
            Volume
            <input
              aria-label="Volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => s.setVolume(Number(e.target.value))}
            />
          </label>
          {displayOpen && !player.activated && (
            <p className="hint">
              Clique uma vez na projeção para liberar o som.
            </p>
          )}
          {player.error && (
            <p className="feedback">
              Não foi possível carregar o vídeo. {player.error}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => s.retryVideo()}
              >
                Tentar novamente
              </Button>
            </p>
          )}
        </div>
      )}
      {live?.kind === "timer" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => s.controlTimer("reset", "live")}
        >
          Redefinir timer no ar
        </Button>
      )}
      <div className="operation-details">
        {nextItem && (
          <div className="next-plan">
            <div>
              <div className="eyebrow">PRÓXIMO NO ROTEIRO</div>
              <p>{nextTitle}</p>
              {nextItem.note && (
                <span className="hint">Nota privada: {nextItem.note}</span>
              )}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => s.prepareItem(nextItem)}
            >
              {nextItem.type === "label" ? "Iniciar etapa" : "Preparar próximo"}
            </Button>
          </div>
        )}
        {preview?.kind === "media" && (
          <div>
            <div className="panel-heading">SLIDES · clique para preparar</div>
            <div className="slide-strip">
              {preview.assetIds.map((id, slide) => (
                <button
                  key={id}
                  aria-label={`Preparar slide ${slide + 1}`}
                  aria-pressed={preview.slide === slide}
                  onClick={() => s.prepare({ ...preview, slide }, s.previewUid)}
                >
                  <div>
                    <AssetImage id={id} thumbnail />
                  </div>
                  <span>
                    {slide + 1}
                    {live?.kind === "media" && live.assetIds[live.slide] === id
                      ? " · NO AR"
                      : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {next && (
          <div className="next-content">
            <div className="next-screen">
              <ContentScreen
                frame={resolveContent(
                  next,
                  liveBooks,
                  videos,
                  frame?.kind === "passage" ? frame.style : style,
                )}
              />
            </div>
            <div>
              <div className="eyebrow">PRÓXIMO NO CONTEÚDO</div>
              <p>
                {next.kind === "media" ? `Slide ${next.slide + 1}` : next.title}
              </p>
              <span className="hint">Use Próximo para avançar no ar.</span>
            </div>
          </div>
        )}
        {preview && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => s.addContent(preview)}
            >
              + Adicionar preparado ao roteiro
            </Button>
          </div>
        )}
        {preview?.kind === "hymn" &&
          (!simple || !videos[String(preview.hymnId)]) && (
            <VideoLink
              hymnId={preview.hymnId}
              videoId={videos[String(preview.hymnId)] ?? null}
            />
          )}
      </div>
    </section>
  );
}
