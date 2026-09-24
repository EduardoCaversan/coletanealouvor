import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, Copy, FolderOpen, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/useApp";

export function ServicePlans() {
  const setlist = useApp((state) => state.setlist);
  const plans = useApp((state) => state.savedPlans);
  const currentPlanId = useApp((state) => state.currentPlanId);
  const name = useApp((state) => state.planName);
  const date = useApp((state) => state.planDate);
  const dirty = useApp((state) => state.planDirty);
  const setDetails = useApp((state) => state.setPlanDetails);
  const save = useApp((state) => state.saveServicePlan);
  const load = useApp((state) => state.loadServicePlan);
  const duplicate = useApp((state) => state.duplicateServicePlan);
  const remove = useApp((state) => state.deleteServicePlan);
  const [open, setOpen] = useState(false);

  const loadPlan = (id: string) => {
    if (
      dirty &&
      setlist.length > 0 &&
      !window.confirm("Carregar esta programação substituirá o roteiro atual não salvo. Continuar?")
    ) {
      return;
    }
    load(id);
    setOpen(false);
  };

  return (
    <div className="space-y-2 border-b border-ink-800 px-3 py-2">
      <div className="flex gap-1.5">
        <Input
          value={name}
          onChange={(event) => setDetails(event.target.value, date)}
          placeholder="Nome da programação"
          className="h-8 min-w-0 text-xs"
          aria-label="Nome da programação"
        />
        <Input
          type="date"
          value={date}
          onChange={(event) => setDetails(name, event.target.value)}
          className="h-8 w-32 shrink-0 px-2 text-xs"
          aria-label="Data da programação"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Button size="sm" className="flex-1" onClick={save} disabled={!name.trim() || setlist.length === 0}>
          <Save className="size-3.5" />
          {currentPlanId ? (dirty ? "Salvar alterações" : "Salvo") : "Salvar programação"}
        </Button>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button variant="secondary" size="sm" title="Programações salvas">
              <FolderOpen className="size-3.5" />
              {plans.length}
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
            <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[80vh] w-[min(94vw,36rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl focus:outline-none">
              <header className="flex items-start gap-3 border-b border-ink-800 p-4">
                <CalendarDays className="mt-0.5 size-5 text-brand-400" />
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="font-semibold text-ink-100">Programações salvas</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-ink-400">
                    Salvas somente neste navegador. Carregar não altera o conteúdo no ar.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" className="-mt-2 -mr-2" aria-label="Fechar">
                    <X className="size-4" />
                  </Button>
                </Dialog.Close>
              </header>

              <div className="max-h-[60vh] overflow-y-auto p-3">
                {plans.length === 0 ? (
                  <p className="p-6 text-center text-sm text-ink-400">Nenhuma programação salva.</p>
                ) : (
                  <ul className="space-y-2">
                    {plans.map((plan) => (
                      <li
                        key={plan.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2",
                          plan.id === currentPlanId ? "border-brand-600/60 bg-brand-600/10" : "border-ink-800",
                        )}
                      >
                        <button className="min-w-0 flex-1 text-left" onClick={() => loadPlan(plan.id)}>
                          <span className="block truncate text-sm font-medium text-ink-200">{plan.name}</span>
                          <span className="text-xs text-ink-400">
                            {plan.date || "Sem data"} · {plan.items.length} itens
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => duplicate(plan.id)}
                          title="Duplicar programação"
                          aria-label={`Duplicar ${plan.name}`}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400"
                          onClick={() => {
                            if (window.confirm(`Excluir a programação “${plan.name}”?`)) remove(plan.id);
                          }}
                          title="Excluir programação"
                          aria-label={`Excluir ${plan.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      {dirty && currentPlanId && <p className="text-[11px] text-amber-400">Alterações ainda não salvas.</p>}
    </div>
  );
}
