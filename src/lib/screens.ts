/**
 * Abertura da janela de projeção. Em desktop com a Window Management API
 * (Chrome/Edge) conseguimos posicionar a janela na tela do projetor e entrar em
 * tela cheia lá. Sem a API, abrimos uma janela normal — o operador arrasta para
 * a segunda tela e aperta F11 / o botão de tela cheia.
 */
export type ScreenInfo = {
  key: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary: boolean;
  isCurrent: boolean;
};

type ScreenDetailed = Screen & {
  left: number;
  top: number;
  label: string;
  isPrimary: boolean;
};

type ScreenDetails = {
  screens: ScreenDetailed[];
  currentScreen: ScreenDetailed;
  addEventListener(type: "screenschange", listener: () => void): void;
};

declare global {
  interface Window {
    getScreenDetails?: () => Promise<ScreenDetails>;
  }
}

export const supportsScreenPlacement = () =>
  typeof window.getScreenDetails === "function";

export async function listScreens(): Promise<ScreenInfo[]> {
  if (!supportsScreenPlacement()) return [];
  try {
    const details = await window.getScreenDetails!();
    return details.screens.map((screen, index) => ({
      key: `${screen.left}:${screen.top}`,
      label: screen.label || `Tela ${index + 1}`,
      left: screen.left,
      top: screen.top,
      width: screen.width,
      height: screen.height,
      isPrimary: screen.isPrimary,
      isCurrent: screen === details.currentScreen,
    }));
  } catch {
    // Permissão negada: seguimos no modo janela simples.
    return [];
  }
}

/** Tela preferida para projetar: a estendida, se houver. */
export async function preferredScreen(savedKey?: string | null) {
  const screens = await listScreens();
  if (screens.length === 0) return null;
  return (
    screens.find((screen) => screen.key === savedKey) ??
    screens.find((screen) => !screen.isCurrent) ??
    screens.find((screen) => !screen.isPrimary) ??
    null
  );
}

export type DisplayWindow = {
  window: Window;
  screenLabel: string | null;
};

export async function openDisplayWindow(
  savedKey?: string | null,
): Promise<DisplayWindow | null> {
  const child = window.open(
    `${import.meta.env.BASE_URL}projecao`,
    "ekklesia-projecao",
    "popup=yes,width=1280,height=720",
  );
  if (!child) return null;
  const screen = await preferredScreen(savedKey);
  if (screen) {
    try {
      child.moveTo(screen.left, screen.top);
      child.resizeTo(screen.width, screen.height);
    } catch {
      /* Manual screen placement remains available. */
    }
  }
  child.focus();
  return { window: child, screenLabel: screen?.label ?? null };
}
