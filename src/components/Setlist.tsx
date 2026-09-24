import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BookOpen, Copy, GripVertical, ListPlus, StickyNote, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServicePlans } from "@/components/ServicePlans";
import { passageReference } from "@/lib/bible";
import { SETLIST_TEMPLATES } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { useApp } from "@/store/useApp";
import type { SetlistItem } from "@/lib/types";

/** Roteiro do culto: programação e hinos, em uma lista só, arrastável. */
export function Setlist() {
  const setlist = useApp((state) => state.setlist);
  const activeUid = useApp((state) => state.activeUid);
  const reorder = useApp((state) => state.reorderSetlist);
  const clear = useApp((state) => state.clearSetlist);
  const loadTemplate = useApp((state) => state.loadSetlistTemplate);
  const addLabel = useApp((state) => state.addLabelToSetlist);
  const undoAvailable = useApp((state) => state.undoSetlist != null);
  const undo = useApp((state) => state.undoSetlistChange);

  const [labelInput, setLabelInput] = useState("");
  const activeIndex = setlist.findIndex((item) => item.uid === activeUid);
  const nextUid = activeIndex >= 0 ? setlist[activeIndex + 1]?.uid : undefined;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = setlist.findIndex((item) => item.uid === active.id);
    const to = setlist.findIndex((item) => item.uid === over.id);
    reorder(arrayMove(setlist, from, to));
  };

  const submitLabel = () => {
    if (!labelInput.trim()) return;
    addLabel(labelInput);
    setLabelInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ServicePlans />
      <header className="flex flex-col gap-2 px-3 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold tracking-wider text-ink-400 uppercase">
            Programação · {setlist.length}
          </h2>
          <div className="flex items-center">
            {undoAvailable && (
              <Button variant="ghost" size="sm" onClick={undo} title="Desfazer última alteração">
                <Undo2 className="size-3.5" />
                Desfazer
              </Button>
            )}
            {setlist.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm("Limpar todos os itens do roteiro atual?")) clear();
                }}
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SETLIST_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => loadTemplate(template)}
              className="rounded-full border border-ink-700 px-2.5 py-1 text-[11px] text-ink-300 hover:border-brand-600/60 hover:text-ink-100"
              title={`Acrescentar a programação de ${template.name} ao roteiro`}
            >
              + {template.name}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          <Input
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submitLabel()}
            placeholder="Etapa da programação (ex: Boas-vindas)"
            className="h-8 text-xs"
          />
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={submitLabel}
            disabled={!labelInput.trim()}
            aria-label="Adicionar etapa ao roteiro"
          >
            <ListPlus className="size-4" />
          </Button>
        </div>
      </header>

      {setlist.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ink-400">
          Adicione hinos pelo <span className="text-ink-200">+</span> da busca, carregue um modelo de
          programação ou digite uma etapa acima para montar a ordem do culto.
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={setlist.map((item) => item.uid)}
              strategy={verticalListSortingStrategy}
            >
              {setlist.map((item, index) => (
                <Row
                  key={item.uid}
                  item={item}
                  index={index}
                  active={item.uid === activeUid}
                  next={item.uid === nextUid}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function Row({
  item,
  index,
  active,
  next,
}: {
  item: SetlistItem;
  index: number;
  active: boolean;
  next: boolean;
}) {
  const remove = useApp((state) => state.removeFromSetlist);
  const duplicate = useApp((state) => state.duplicateSetlistItem);
  const setNote = useApp((state) => state.setSetlistItemNote);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.uid,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group mb-1 flex items-center gap-1 rounded-lg px-1 py-1.5",
        active
          ? "bg-brand-600/15 ring-1 ring-brand-600/50"
          : next
            ? "bg-sky-500/10 ring-1 ring-sky-500/30"
            : "hover:bg-ink-800",
        isDragging && "opacity-60",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab px-1 text-ink-400 active:cursor-grabbing"
        aria-label="Reordenar"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-5 text-center text-xs text-ink-400">{index + 1}</span>
      <div className="min-w-0 flex-1">
        {item.type === "hymn" && <HymnRow item={item} active={active} />}
        {item.type === "passage" && <PassageRow item={item} active={active} />}
        {item.type === "label" && <LabelRow item={item} />}
        {item.note && (
          <button
            className="mt-0.5 block w-full truncate text-left text-[11px] text-amber-300"
            onClick={() => {
              const note = window.prompt("Nota privada (nunca aparece na projeção):", item.note);
              if (note != null) setNote(item.uid, note);
            }}
            title={item.note}
          >
            <StickyNote className="mr-1 inline size-3" />
            {item.note}
          </button>
        )}
      </div>
      {(active || next) && (
        <span className={cn("text-[9px] font-bold uppercase", active ? "text-brand-400" : "text-sky-300")}>
          {active ? "No ar" : "Próximo"}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => {
          const note = window.prompt("Nota privada (nunca aparece na projeção):", item.note ?? "");
          if (note != null) setNote(item.uid, note);
        }}
        aria-label="Editar nota privada"
        title="Nota privada"
      >
        <StickyNote className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => duplicate(item.uid)}
        aria-label="Duplicar item"
        title="Duplicar item"
      >
        <Copy className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100"
        onClick={() => remove(item.uid)}
        aria-label="Remover do roteiro"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function HymnRow({
  item,
  active,
}: {
  item: Extract<SetlistItem, { type: "hymn" }>;
  active: boolean;
}) {
  const hymn = useApp((state) => state.hymn(item.hymnId));
  const openHymn = useApp((state) => state.openHymn);
  const play = useApp((state) => state.play);

  return (
    <button
      onClick={() => openHymn(item.hymnId, item.uid)}
      onDoubleClick={() => {
        openHymn(item.hymnId, item.uid);
        void play();
      }}
      title="Duplo clique: abre a projeção e já toca"
      className={cn("min-w-0 flex-1 truncate text-left text-sm", active ? "text-ink-100" : "text-ink-200")}
    >
      {hymn?.title ?? "Hino removido"}
      {hymn && <span className="ml-2 text-xs tabular-nums text-ink-500">{hymn.number}</span>}
    </button>
  );
}

function PassageRow({
  item,
  active,
}: {
  item: Extract<SetlistItem, { type: "passage" }>;
  active: boolean;
}) {
  const bible = useApp((state) => state.bible);
  const openPassage = useApp((state) => state.openPassage);
  const { uid: itemUid, type: _type, note: _note, ...ref } = item;
  void _type;
  void _note;

  return (
    <button
      onDoubleClick={() => openPassage(ref, itemUid)}
      title="Duplo clique: projeta a passagem"
      className={cn("min-w-0 flex-1 truncate text-left text-sm", active ? "text-ink-100" : "text-ink-200")}
    >
      <BookOpen className="mr-2 inline size-3.5 shrink-0 text-brand-400" />
      {bible.length ? passageReference(bible, ref) : "Passagem"}
    </button>
  );
}

/** Etapa da programação sem hino (ex: "Oração inicial"); o texto pode ser editado no lugar. */
function LabelRow({ item }: { item: Extract<SetlistItem, { type: "label" }> }) {
  const rename = useApp((state) => state.renameSetlistLabel);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.text);

  const commit = () => {
    setEditing(false);
    if (value.trim() && value.trim() !== item.text) rename(item.uid, value);
    else setValue(item.text);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setValue(item.text);
            setEditing(false);
          }
        }}
        className="min-w-0 flex-1 rounded bg-ink-800 px-1 text-sm text-ink-100 outline-none ring-1 ring-brand-600/50"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="min-w-0 flex-1 truncate text-left text-sm text-ink-400 italic"
      title="Clique para editar"
    >
      {item.text}
    </button>
  );
}
