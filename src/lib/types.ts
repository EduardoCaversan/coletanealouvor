import type { PassageStyle } from "@/lib/passageStyle";

export type Hymn = {
  /** Identificador estável; o número se repete nas variações A/B. */
  id: number;
  number: number;
  title: string;
  /** Título sem acento e em minúsculas, para a busca. */
  search: string;
};

export type Hymnal = {
  generatedAt: string;
  language: string;
  hymns: Hymn[];
};

/** Mapa id do hino -> id do vídeo no YouTube. */
export type VideoMap = Record<string, string>;

/** Um livro da Bíblia, com o texto de cada capítulo dividido em versículos. */
export type BibleBook = {
  abbrev: string;
  name: string;
  /** Nome sem acento e em minúsculas, para a busca. */
  search: string;
  testament: "at" | "nt";
  /** chapters[capítulo - 1][versículo - 1] */
  chapters: string[][];
};

export type Bible = {
  generatedAt: string;
  version: string;
  books: BibleBook[];
};

/** Recorte de versículos escolhido para projetar (ex: João 3:16-18). */
export type PassageRef = {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
};

/** Um item do roteiro do culto: um hino, uma passagem bíblica ou uma etapa da programação. */
export type SetlistItem =
  | {
      /** Identificador local do item; o mesmo hino pode entrar duas vezes. */
      uid: string;
      type: "hymn";
      hymnId: number;
      note?: string;
    }
  | ({
      uid: string;
      type: "passage";
      note?: string;
    } & PassageRef)
  | {
      uid: string;
      type: "label";
      text: string;
      note?: string;
    };

export type SavedServicePlan = {
  id: string;
  name: string;
  date: string;
  items: SetlistItem[];
  createdAt: number;
  updatedAt: number;
};

/** Modelo pronto de programação (culto de sábado, escola sabatina) para montar o roteiro. */
export type SetlistTemplate = {
  id: string;
  name: string;
  items: string[];
};

/** O que o controle manda para a janela de projeção. */
export type LiveState = {
  videoId: string | null;
  title: string;
  /** Tela preta por cima do vídeo, sem parar a reprodução. */
  blank: boolean;
  /** Reprodução desejada pelo operador. */
  playing: boolean;
  volume: number;
  /** Pedido de busca na linha do tempo; o nonce faz repetir o mesmo segundo. */
  seek: { time: number; nonce: number } | null;
  /** Passagem bíblica em cartaz; substitui o vídeo na tela enquanto ativa. */
  passage: { reference: string; verses: { number: number; text: string }[] } | null;
  /** Aparência da passagem na projeção (fonte, fundo, cor da letra). */
  passageStyle: PassageStyle;
  updatedAt: number;
};

/** O que a janela de projeção responde sobre o player. */
export type PlayerState = {
  /** O player do YouTube carregou. */
  ready: boolean;
  /** O operador já liberou o som com um clique na janela de projeção. */
  activated: boolean;
  playing: boolean;
  buffering: boolean;
  ended: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
  updatedAt: number;
};
