import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const shortcuts = [
  ["Enter", "Colocar o hino selecionado no ar"],
  ["Espaço", "Tocar ou pausar"],
  ["← / P", "Anterior"],
  ["→ / N", "Próximo"],
  ["B", "Ativar ou desativar blackout"],
  ["?", "Abrir esta ajuda"],
] as const;

export function ShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-3">
            <Keyboard className="mt-0.5 size-5 text-brand-400" />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-semibold text-ink-100">Atalhos do controle</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-400">
                Atalhos ficam desativados enquanto você digita em um campo.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-2 -mr-2" aria-label="Fechar ajuda">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </div>

          <dl className="mt-5 divide-y divide-ink-800">
            {shortcuts.map(([key, action]) => (
              <div key={key} className="flex items-center gap-4 py-2.5">
                <dt className="w-24 shrink-0">
                  <kbd className="rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs font-semibold text-ink-200">
                    {key}
                  </kbd>
                </dt>
                <dd className="text-sm text-ink-300">{action}</dd>
              </div>
            ))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
