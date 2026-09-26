import { openDB } from "idb";
import type { Content } from "./content";

export type MediaEntry = {
  id: string;
  content: Extract<Content, { kind: "media" }>;
  createdAt: number;
  bytes: number;
  source: string;
};
// Retain the historical DB name: imported files must survive the Ekklesia rebrand.
const database = () =>
  openDB("coletanea-media", 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("assets"))
        db.createObjectStore("assets");
      if (!db.objectStoreNames.contains("entries"))
        db.createObjectStore("entries", { keyPath: "id" });
      if (!db.objectStoreNames.contains("thumbnails"))
        db.createObjectStore("thumbnails");
    },
  });

export async function listMedia(): Promise<MediaEntry[]> {
  const db = await database();
  try {
    return await db.getAll("entries");
  } finally {
    db.close();
  }
}
export async function readAsset(
  id: string,
  thumbnail = false,
): Promise<Blob | undefined> {
  const db = await database();
  try {
    return thumbnail
      ? ((await db.get("thumbnails", id)) ?? (await db.get("assets", id)))
      : await db.get("assets", id);
  } finally {
    db.close();
  }
}

export async function removeMedia(entry: MediaEntry) {
  const db = await database();
  try {
    const tx = db.transaction(["assets", "entries", "thumbnails"], "readwrite");
    for (const id of entry.content.assetIds) {
      void tx.objectStore("assets").delete(id);
      void tx.objectStore("thumbnails").delete(id);
    }
    void tx.objectStore("entries").delete(entry.id);
    await tx.done;
  } finally {
    db.close();
  }
}

const canvasBlob = (canvas: HTMLCanvasElement, type = "image/png") =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Não foi possível preparar a imagem.")),
      type,
      0.94,
    ),
  );

export async function importMedia(
  files: File[],
  sequence: boolean,
  progress: (message: string) => void,
): Promise<MediaEntry[]> {
  if (!files.length) return [];
  if (files.some((f) => /\.pptx?$/i.test(f.name)))
    throw new Error(
      "Para máxima compatibilidade, exporte a apresentação como PDF no PowerPoint e importe o PDF aqui.",
    );
  if (files.some((f) => !/\.(pdf|png|jpe?g|webp)$/i.test(f.name)))
    throw new Error("Escolha PDF, PNG, JPG ou WebP.");
  if (files.some((f) => f.size > 100 * 1024 * 1024))
    throw new Error(
      "Escolha arquivos de até 100 MB. Divida apresentações maiores em PDFs menores.",
    );
  const groups =
    sequence && files.every((f) => !/\.pdf$/i.test(f.name))
      ? [files]
      : files.map((f) => [f]);
  const entries: MediaEntry[] = [];
  for (const group of groups) {
    const db = await database();
    const assetIds: string[] = [];
    let bytes = 0;
    const persist = async (blob: Blob) => {
      const id = crypto.randomUUID();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      const scale = Math.min(320 / bitmap.width, 180 / bitmap.height);
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const thumbnail = await canvasBlob(canvas, "image/webp");
      const tx = db.transaction(["assets", "thumbnails"], "readwrite");
      void tx.objectStore("assets").put(blob, id);
      void tx.objectStore("thumbnails").put(thumbnail, id);
      await tx.done;
      assetIds.push(id);
      bytes += blob.size;
    };
    try {
      for (const file of group) {
        progress(`Preparando ${file.name}…`);
        if (/\.pdf$/i.test(file.name)) {
          const { renderPdf } = await import("./pdf");
          await renderPdf(file, async (canvas, page, total) => {
            progress(`${file.name} · página ${page} de ${total}`);
            await persist(await canvasBlob(canvas));
          });
        } else {
          const bitmap = await createImageBitmap(file);
          if (bitmap.width * bitmap.height > 80_000_000) {
            bitmap.close();
            throw new Error(
              "Imagem muito grande. Reduza para até 80 megapixels.",
            );
          }
          bitmap.close();
          await persist(file);
        }
      }
      const title =
        group.length > 1
          ? `Sequência · ${group[0].name}`
          : group[0].name.replace(/\.[^.]+$/, "");
      const entry: MediaEntry = {
        id: crypto.randomUUID(),
        content: { kind: "media", title, assetIds, slide: 0 },
        bytes,
        createdAt: Date.now(),
        source: group.map((f) => f.name).join(", "),
      };
      await db.put("entries", entry);
      entries.push(entry);
    } catch (error) {
      // Incomplete imports never enter the library; discard only the assets created by this import.
      const tx = db.transaction(["assets", "thumbnails"], "readwrite");
      for (const id of assetIds) {
        void tx.objectStore("assets").delete(id);
        void tx.objectStore("thumbnails").delete(id);
      }
      await tx.done;
      throw error;
    } finally {
      db.close();
    }
  }
  return entries;
}
