import type { LiveState, PlayerState } from "@/lib/types";

export type ChannelMessage =
  /** Quem chega pede o estado atual. */
  | { type: "hello" }
  | { type: "display-open" }
  | { type: "display-closed" }
  /** Diagnóstico pontual; não carrega nem altera estado de projeção. */
  | { type: "health-ping"; id: string }
  | { type: "health-pong"; id: string }
  /** Controle -> projeção. */
  | { type: "state"; state: LiveState }
  /** Projeção -> controle. */
  | { type: "player"; state: PlayerState }
  /** Teclado da janela de projeção. */
  | { type: "command"; action: "next" | "prev" | "blank" | "toggle" };

const NAME = "ekklesia-live";

/**
 * Canal entre a janela de controle e a janela de projeção. BroadcastChannel
 * cobre navegadores modernos; sem ele, caímos para eventos de `storage`, que
 * funcionam entre janelas de mesma origem em qualquer navegador.
 */
export function createChannel(onMessage: (message: ChannelMessage) => void) {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(NAME);
    channel.onmessage = (event) => onMessage(event.data as ChannelMessage);
    return {
      post: (message: ChannelMessage) => channel.postMessage(message),
      close: () => channel.close(),
    };
  }

  const key = "ekklesia:channel";
  const listener = (event: StorageEvent) => {
    if (event.key !== key || !event.newValue) return;
    try {
      onMessage(JSON.parse(event.newValue).message as ChannelMessage);
    } catch (error) {
      console.warn("Mensagem de comunicação local inválida.", error);
    }
  };
  window.addEventListener("storage", listener);
  return {
    post: (message: ChannelMessage) => {
      try {
        localStorage.setItem(key, JSON.stringify({ at: Date.now(), message }));
      } catch (error) {
        console.warn("Não foi possível enviar a mensagem local.", error);
      }
    },
    close: () => window.removeEventListener("storage", listener),
  };
}
