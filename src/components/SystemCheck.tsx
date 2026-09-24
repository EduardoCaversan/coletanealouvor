import { useCallback, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle2, CircleHelp, Loader2, RefreshCw, ShieldCheck, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runPreServiceDiagnostics, type DiagnosticCheck } from "@/lib/diagnostics";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/useApp";

export function SystemCheck() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);

  const run = useCallback(async () => {
    setRunning(true);
    const state = useApp.getState();
    try {
      setChecks(
        await runPreServiceDiagnostics({
          hymns: state.hymns,
          bible: state.bible,
          setlist: state.setlist,
          videos: state.videos,
          displayOpen: state.displayOpen,
        }),
      );
    } catch (error) {
      console.error("Falha inesperada na verificação pré-culto.", error);
      setChecks([
        {
          id: "diagnostic-error",
          label: "Verificação",
          status: "error",
          message: "Não foi possível concluir a verificação. Recarregue e tente novamente.",
        },
      ]);
    } finally {
      setRunning(false);
    }
  }, []);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) void run();
  };

  const hasError = checks.some((check) => check.status === "error");
  const hasAttention = checks.some((check) => check.status === "warning" || check.status === "unknown");

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" title="Verificação pré-culto" aria-label="Verificação pré-culto">
          <ShieldCheck className="size-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[88vh] w-[min(94vw,38rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl focus:outline-none">
          <header className="flex items-start gap-3 border-b border-ink-800 p-4">
            <ShieldCheck className="mt-0.5 size-5 text-brand-400" />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-semibold text-ink-100">Verificação do sistema</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-400">
                Diagnóstico pontual. Nenhum conteúdo no ar é alterado.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="-mt-2 -mr-2" aria-label="Fechar">
                <X className="size-4" />
              </Button>
            </Dialog.Close>
          </header>

          <div className="max-h-[65vh] overflow-y-auto p-3">
            {running && checks.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-10 text-sm text-ink-400">
                <Loader2 className="size-4 animate-spin" />
                Verificando…
              </div>
            ) : (
              <ul className="space-y-2">
                {checks.map((check) => (
                  <li key={check.id} className="flex gap-3 rounded-lg border border-ink-800 p-3">
                    <StatusIcon status={check.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-200">{check.label}</p>
                      <p className="mt-0.5 text-xs text-ink-400">{check.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex items-center gap-3 border-t border-ink-800 p-4">
            <p
              className={cn(
                "min-w-0 flex-1 text-sm",
                hasError ? "text-red-400" : hasAttention ? "text-amber-400" : "text-brand-400",
              )}
              aria-live="polite"
            >
              {running
                ? "Verificação em andamento…"
                : hasError
                  ? "Há problemas que precisam de atenção."
                  : hasAttention
                    ? "Alguns itens precisam ser conferidos."
                    : "Itens verificados sem problemas detectados."}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void run()} disabled={running}>
              {running ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Verificar novamente
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StatusIcon({ status }: { status: DiagnosticCheck["status"] }) {
  if (status === "ok") return <CheckCircle2 className="size-5 shrink-0 text-brand-400" aria-label="OK" />;
  if (status === "warning") return <AlertTriangle className="size-5 shrink-0 text-amber-400" aria-label="Atenção" />;
  if (status === "error") return <XCircle className="size-5 shrink-0 text-red-400" aria-label="Erro" />;
  return <CircleHelp className="size-5 shrink-0 text-ink-400" aria-label="Desconhecido" />;
}
