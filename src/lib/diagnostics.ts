import { createChannel } from "@/lib/channel";
import { checkIndexedDbAvailable } from "@/lib/storage";
import type { BibleBook, Hymn, SetlistItem, VideoMap } from "@/lib/types";

export type DiagnosticStatus = "ok" | "warning" | "error" | "unknown";

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: DiagnosticStatus;
  message: string;
};

export type DiagnosticSnapshot = {
  hymns: Hymn[];
  bible: BibleBook[];
  setlist: SetlistItem[];
  videos: VideoMap;
  displayOpen: boolean;
};

export function inspectSetlist(snapshot: Pick<DiagnosticSnapshot, "hymns" | "bible" | "setlist" | "videos">): DiagnosticCheck {
  if (snapshot.setlist.length === 0) {
    return { id: "setlist", label: "Roteiro", status: "warning", message: "O roteiro está vazio." };
  }

  const warnings: string[] = [];
  for (const item of snapshot.setlist) {
    if (item.type === "hymn") {
      const hymn = snapshot.hymns.find((candidate) => candidate.id === item.hymnId);
      if (!hymn) warnings.push("hino inválido");
      else if (!snapshot.videos[String(item.hymnId)]) warnings.push(`hino ${hymn.number} sem vídeo`);
    } else if (item.type === "passage") {
      const book = snapshot.bible.find((candidate) => candidate.abbrev === item.book);
      const chapter = book?.chapters[item.chapter - 1];
      if (!chapter || item.verseStart < 1 || item.verseEnd < item.verseStart || item.verseEnd > chapter.length) {
        warnings.push("passagem bíblica inválida");
      }
    } else if (!item.text.trim()) {
      warnings.push("etapa sem nome");
    }
  }

  const unique = [...new Set(warnings)];
  return unique.length
    ? { id: "setlist", label: "Roteiro", status: "warning", message: unique.join("; ") + "." }
    : { id: "setlist", label: "Roteiro", status: "ok", message: `${snapshot.setlist.length} itens verificados.` };
}

export function checkLocalStorageAvailable(): DiagnosticCheck {
  const key = `coletanea:diagnostic:${Date.now()}`;
  try {
    localStorage.setItem(key, "ok");
    const valid = localStorage.getItem(key) === "ok";
    localStorage.removeItem(key);
    return valid
      ? { id: "local-storage", label: "Preferências locais", status: "ok", message: "Disponível." }
      : { id: "local-storage", label: "Preferências locais", status: "error", message: "Não foi possível confirmar a gravação." };
  } catch {
    return {
      id: "local-storage",
      label: "Preferências locais",
      status: "error",
      message: "O navegador bloqueou o armazenamento local.",
    };
  }
}

export async function checkDisplayHandshake(timeoutMs = 1_500): Promise<DiagnosticCheck> {
  if (typeof window === "undefined") {
    return { id: "communication", label: "Comunicação", status: "unknown", message: "Não verificável neste ambiente." };
  }

  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return new Promise((resolve) => {
    let settled = false;
    let channel: ReturnType<typeof createChannel> | null = null;
    const finish = (check: DiagnosticCheck) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      channel?.close();
      resolve(check);
    };
    const timer = window.setTimeout(() => {
      finish({
        id: "communication",
        label: "Comunicação",
        status: "warning",
        message: "A projeção não respondeu dentro do tempo esperado.",
      });
    }, timeoutMs);

    try {
      channel = createChannel((message) => {
        if (message.type === "health-pong" && message.id === id) {
          finish({ id: "communication", label: "Comunicação", status: "ok", message: "Controle e projeção responderam." });
        }
      });
      channel.post({ type: "health-ping", id });
    } catch {
      finish({
        id: "communication",
        label: "Comunicação",
        status: "unknown",
        message: "O navegador não permitiu testar a comunicação.",
      });
    }
  });
}

async function probe(url: string, timeoutMs = 3_000) {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function connectivityChecks(): Promise<DiagnosticCheck[]> {
  if (typeof navigator === "undefined") {
    return [
      { id: "internet", label: "Internet", status: "unknown", message: "Não verificável neste ambiente." },
      { id: "youtube", label: "YouTube", status: "unknown", message: "Não verificável neste ambiente." },
    ];
  }
  if (!navigator.onLine) {
    return [
      { id: "internet", label: "Internet", status: "warning", message: "O navegador está offline." },
      { id: "youtube", label: "YouTube", status: "unknown", message: "Não testado enquanto offline." },
    ];
  }

  const [internet, youtube] = await Promise.all([
    probe("https://www.gstatic.com/generate_204"),
    probe("https://www.youtube-nocookie.com/favicon.ico"),
  ]);
  return [
    internet
      ? { id: "internet", label: "Internet", status: "ok", message: "Acesso externo confirmado." }
      : { id: "internet", label: "Internet", status: "warning", message: "Não foi possível confirmar acesso externo." },
    youtube
      ? { id: "youtube", label: "YouTube", status: "ok", message: "O domínio do player respondeu." }
      : {
          id: "youtube",
          label: "YouTube",
          status: "unknown",
          message: "Não foi possível confirmar o YouTube; bloqueadores podem interferir.",
        },
  ];
}

export async function runPreServiceDiagnostics(snapshot: DiagnosticSnapshot): Promise<DiagnosticCheck[]> {
  const [indexedDb, communication, connectivity] = await Promise.all([
    checkIndexedDbAvailable(),
    checkDisplayHandshake(),
    connectivityChecks(),
  ]);

  return [
    snapshot.hymns.length > 0
      ? { id: "hymnal", label: "Hinário", status: "ok", message: `${snapshot.hymns.length} hinos carregados.` }
      : { id: "hymnal", label: "Hinário", status: "error", message: "O hinário não está disponível." },
    snapshot.bible.length > 0
      ? { id: "bible", label: "Bíblia", status: "ok", message: `${snapshot.bible.length} livros carregados.` }
      : { id: "bible", label: "Bíblia", status: "warning", message: "O texto bíblico não está disponível." },
    checkLocalStorageAvailable(),
    indexedDb
      ? { id: "indexed-db", label: "Cache offline", status: "ok", message: "IndexedDB disponível." }
      : { id: "indexed-db", label: "Cache offline", status: "error", message: "IndexedDB indisponível." },
    snapshot.displayOpen
      ? { id: "display", label: "Projeção", status: "ok", message: "A janela informou que está aberta." }
      : { id: "display", label: "Projeção", status: "warning", message: "Janela de projeção não detectada." },
    communication,
    ...connectivity,
    inspectSetlist(snapshot),
  ];
}
