import type { Content } from "./content";

// Metadata and embedded playback checked on 2026-09-26 (UTC).
// Only remote references; no audio, video, lyrics or album artwork is redistributed.
export const musicLibrary: (Extract<Content, { kind: "youtube" }> & {
  publisher: string;
  source: string;
})[] = [
  {
    kind: "youtube",
    videoId: "RvXJGbnJ6jc",
    title: "Estou Aqui (Letra)",
    collection: "Adoradores 4",
    publisher: "Gravadora Novo Tempo",
    source: "https://www.youtube.com/watch?v=RvXJGbnJ6jc",
  },
  {
    kind: "youtube",
    videoId: "JD35iiN8N20",
    title: "Seja o Centro (Letra)",
    collection: "Adoradores 4",
    publisher: "Gravadora Novo Tempo",
    source: "https://www.youtube.com/watch?v=JD35iiN8N20",
  },
  {
    kind: "youtube",
    videoId: "FDlaXCsCP9U",
    title: "Levanto a Cruz (Letra)",
    collection: "Adoradores 4",
    publisher: "Gravadora Novo Tempo",
    source: "https://www.youtube.com/watch?v=FDlaXCsCP9U",
  },
  {
    kind: "youtube",
    videoId: "GsJR4rRldgo",
    title: "O Melhor Lugar do Mundo (Ao Vivo)",
    collection: "Novo Tom · seleção oficial",
    publisher: "Rede Novo Tempo de Comunicação",
    source: "https://www.youtube.com/watch?v=GsJR4rRldgo",
  },
  {
    kind: "youtube",
    videoId: "fOR2BvQGCTw",
    title: "Jader Santos · 3 horas de piano",
    collection: "Instrumentais",
    category: "Fundo / prelúdio",
    publisher: "Gravadora Novo Tempo",
    source: "https://www.youtube.com/watch?v=fOR2BvQGCTw",
  },
  {
    kind: "youtube",
    videoId: "9sJxWBf6w-s",
    title: "1 hora instrumental piano · A sós com Deus",
    collection: "Instrumentais",
    category: "Oração / reflexão",
    publisher: "Matheus Rizzo",
    source: "https://www.youtube.com/watch?v=9sJxWBf6w-s",
  },
];
