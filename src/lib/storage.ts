import { openDB, type IDBPDatabase } from "idb";
import type { BibleVersionId } from "@/lib/bibleVersions";
import type { Bible, Hymnal, VideoMap } from "@/lib/types";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  // Historical storage names are intentionally retained across the Ekklesia rebrand.
  // Same-origin installations keep their existing cache and operator data.
  if (!dbPromise) {
    dbPromise = openDB("coletanea", 1, {
      upgrade(database) {
        database.createObjectStore("acervo");
      },
    });
  }
  return dbPromise;
}

async function read<T>(key: string): Promise<T | undefined> {
  try {
    return (await (await db()).get("acervo", key)) as T | undefined;
  } catch {
    return undefined;
  }
}

async function write(key: string, value: unknown) {
  try {
    await (await db()).put("acervo", value, key);
  } catch {
    // Modo privado / cota cheia: seguimos sem cache offline.
  }
}

/**
 * Carrega um JSON servindo primeiro o que está em IndexedDB e revalidando em
 * segundo plano — a busca abre sem esperar a rede.
 */
async function fetchWithTimeout(url: string, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function cachedJson<T>(
  url: string,
  key: string,
  onFresh?: (value: T) => void,
): Promise<T> {
  const cached = await read<{ etag: string; value: T }>(key);
  const revalidate = fetchWithTimeout(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const etag = response.headers.get("etag") ?? "";
      if (cached && etag && etag === cached.etag) return cached.value;
      const value = (await response.json()) as T;
      await write(key, { etag, value });
      return value;
    })
    .catch((error) => {
      if (cached) return cached.value;
      throw error;
    });

  if (cached) {
    void revalidate.then((value) => {
      if (value !== cached.value) onFresh?.(value);
    });
    return cached.value;
  }
  return revalidate;
}

/** Caminho absoluto dos dados estáticos, respeitando o base path do deploy (ex: GitHub Pages). */
const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;

export function loadHymnal(onFresh?: (hymnal: Hymnal) => void) {
  return cachedJson<Hymnal>(dataUrl("hymnal.json"), "hymnal", onFresh);
}

export function loadBible(
  version: BibleVersionId,
  onFresh?: (bible: Bible) => void,
) {
  return cachedJson<Bible>(
    dataUrl(`biblia-${version}.json`),
    `biblia:${version}`,
    onFresh,
  );
}

/** Confirma que o banco local pode ser aberto e lido, sem alterar dados do operador. */
export async function checkIndexedDbAvailable() {
  try {
    const transaction = (await db()).transaction("acervo", "readonly");
    await transaction.done;
    return true;
  } catch {
    return false;
  }
}

/**
 * Mapa hino -> vídeo. O arquivo do projeto é a base; o que o operador cadastra
 * na mão fica por cima, no navegador dele.
 */
export async function loadVideoMap(): Promise<VideoMap> {
  let base: VideoMap = {};
  try {
    const response = await fetchWithTimeout(dataUrl("videos.json"));
    if (response.ok) base = (await response.json()) as VideoMap;
  } catch {
    // Sem arquivo de vídeos ainda: vale só o que o operador cadastrar.
  }
  return { ...base, ...local.get<VideoMap>("videos", {}) };
}

const PREFIX = "coletanea:"; // Legacy data namespace; not public branding.

export const local = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("storage-failure"));
    }
  },
};
