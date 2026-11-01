"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { TopBar } from "@/components/layout/top-bar";
import { PlanMenu } from "@/components/plans/plan-menu";
import { SortableExerciseRow, type EditorItem } from "@/components/plans/sortable-exercise-row";
import { TemplateExerciseSheet, type SaveState } from "@/components/plans/template-exercise-sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { ExerciseSummary } from "@/lib/exercises/types";
import {
  addTemplateExercise,
  removeTemplateExercise,
  reorderTemplateExercises,
  restoreTemplate,
  updateTemplateExercise,
} from "@/lib/plans/actions";
import type { TemplateDetail } from "@/lib/plans/types";
import { moveById, moveItem } from "@/lib/reorder";
import { strings } from "@/lib/strings";
import { templateExerciseSettingsSchema, type TemplateExerciseSettings } from "@/lib/validation/plans";

const { editor } = strings.plans;
const SAVE_DELAY_MS = 500;

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const tempId = () => `temp-${crypto.randomUUID()}`;


function settingsOf(item: EditorItem): TemplateExerciseSettings {
  return {
    planned_sets: item.planned_sets,
    rep_range_min: item.rep_range_min,
    rep_range_max: item.rep_range_max,
    note: item.note,
    target_weight_kg: item.target_weight_kg,
  };
}

export function PlanEditor({ plan, exercises }: { plan: TemplateDetail; exercises: ExerciseSummary[] }) {
  const [name, setName] = useState(plan.name);
  const [archived, setArchived] = useState(plan.is_archived);
  const [items, setItems] = useState<EditorItem[]>(plan.exercises);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  // The sheet stays mounted with the last item so it can animate closed.
  const [sheetItemId, setSheetItemId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // dnd-kit's default ids come from a module counter that differs between server and client.
  const dndId = useId();

  // Timers and callbacks read the latest items through a ref.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // Removed locally but not yet deleted on the server (the undo window).
  const pendingDeletes = useRef(new Set<string>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateItem = (id: string, update: (item: EditorItem) => EditorItem) =>
    setItems((prev) => prev.map((item) => (item.id === id ? update(item) : item)));

  // ---------------------------------------------------------------------------
  // Settings: applied locally at once, saved after a short pause
  // ---------------------------------------------------------------------------

  async function flushSave(id: string) {
    clearTimeout(saveTimers.current.get(id));
    saveTimers.current.delete(id);
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item || item.pending) return;

    const parsed = templateExerciseSettingsSchema.safeParse(settingsOf(item));
    if (!parsed.success) return setSaveState("idle");

    const result = await updateTemplateExercise(id, parsed.data);
    if (!result.ok) {
      setSaveState("idle");
      toast.error(strings.common.saveFailed, {
        action: { label: strings.common.retry, onClick: () => void flushSave(id) },
      });
      return;
    }
    if (saveTimers.current.size === 0) setSaveState("saved");
  }

  function changeSettings(id: string, settings: Partial<TemplateExerciseSettings>) {
    updateItem(id, (item) => ({ ...item, ...settings }));
    setSaveState("saving");
    clearTimeout(saveTimers.current.get(id));
    saveTimers.current.set(
      id,
      setTimeout(() => void flushSave(id), SAVE_DELAY_MS),
    );
  }

  function closeSheet() {
    setOpenItemId(null);
    for (const id of [...saveTimers.current.keys()]) void flushSave(id);
  }

  // ---------------------------------------------------------------------------
  // Order
  // ---------------------------------------------------------------------------

  async function persistOrder(next: EditorItem[], previous: EditorItem[]) {
    setItems(next);
    // Items in their undo window still exist on the server, so they keep a place at the end.
    const ids = [...next.map((item) => item.id), ...pendingDeletes.current];
    const result = await reorderTemplateExercises(plan.id, ids);
    if (!result.ok) {
      setItems(previous);
      toast.error(strings.common.saveFailed);
    }
  }

  const hasPending = items.some((item) => item.pending);

  function moveBy(id: string, delta: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    if (hasPending || index === -1) return;
    void persistOrder(moveItem(items, index, index + delta), items);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id || hasPending) return;
    void persistOrder(moveById(items, String(active.id), String(over.id)), items);
  }

  // ---------------------------------------------------------------------------
  // Add / remove exercises
  // ---------------------------------------------------------------------------

  async function addExercise(exercise: ExerciseSummary) {
    const id = tempId();
    const position = Math.max(0, ...itemsRef.current.map((item) => item.position)) + 1;
    setItems((prev) => [
      ...prev,
      { id, position, planned_sets: 3, rep_range_min: null, rep_range_max: null, note: null, target_weight_kg: null, exercise, pending: true },
    ]);

    const result = await addTemplateExercise(plan.id, exercise.id);
    if (!result.ok) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      return void toast.error(result.error);
    }
    updateItem(id, (item) => ({ ...item, id: result.data.id, position: result.data.position, pending: false }));
  }

  function removeExercise(id: string) {
    const index = items.findIndex((item) => item.id === id);
    const removed = items[index];
    if (!removed) return;

    clearTimeout(saveTimers.current.get(id));
    saveTimers.current.delete(id);
    pendingDeletes.current.add(id);
    setOpenItemId(null);
    setItems((prev) => prev.filter((item) => item.id !== id));

    // The server delete waits for the undo window to close (and never runs after "undo").
    const restore = () =>
      setItems((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, removed);
        return next;
      });
    const commit = async () => {
      if (!pendingDeletes.current.delete(id)) return;
      const result = await removeTemplateExercise(id);
      if (!result.ok) {
        restore();
        toast.error(result.error);
      }
    };
    toast(editor.removed, {
      action: {
        label: strings.common.undo,
        onClick: () => {
          if (pendingDeletes.current.delete(id)) restore();
        },
      },
      onAutoClose: () => void commit(),
      onDismiss: () => void commit(),
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const sheetItem = items.find((item) => item.id === sheetItemId);
  const sheetIndex = sheetItem ? items.indexOf(sheetItem) : -1;
  const nameById = (id: string | number) => items.find((item) => item.id === id)?.exercise.name_he ?? "";

  const announcements: Announcements = {
    onDragStart: ({ active }) => editor.dnd.picked(nameById(active.id)),
    onDragOver: ({ active, over }) =>
      over ? editor.dnd.moved(nameById(active.id), items.findIndex((i) => i.id === over.id) + 1) : undefined,
    onDragEnd: ({ active, over }) =>
      over ? editor.dnd.dropped(nameById(active.id), items.findIndex((i) => i.id === over.id) + 1) : undefined,
    onDragCancel: ({ active }) => editor.dnd.cancelled(nameById(active.id)),
  };

  const addButton = (
    <Button size="lg" className="w-full" onClick={() => setPickerOpen(true)}>
      <PlusIcon aria-hidden="true" />
      {editor.addExercise}
    </Button>
  );

  return (
    <>
      <TopBar
        title={name}
        backHref="/plans"
        action={
          <PlanMenu plan={{ id: plan.id, name, is_archived: archived }} onRenamed={setName} onArchivedChange={setArchived} />
        }
      />

      {archived && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md bg-blush px-4 py-2">
          <p className="text-label">{editor.archivedNote}</p>
          <Button
            variant="link"
            className="shrink-0 px-0"
            onClick={async () => {
              const result = await restoreTemplate(plan.id);
              if (!result.ok) return void toast.error(result.error);
              setArchived(false);
              toast.success(strings.plans.restored);
            }}
          >
            {strings.plans.restore}
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={ClipboardDocumentListIcon} title={editor.empty} body={editor.emptyHint} action={addButton} />
      ) : (
        <>
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            accessibility={{ announcements, screenReaderInstructions: { draggable: editor.dnd.instructions } }}
          >
            <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <SortableExerciseRow
                    key={item.id}
                    item={item}
                    onOpen={() => {
                      setSaveState("idle");
                      setSheetItemId(item.id);
                      setOpenItemId(item.id);
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <div className="mt-6">{addButton}</div>
        </>
      )}

      {sheetItem && (
        <TemplateExerciseSheet
          key={sheetItem.id}
          item={sheetItem}
          open={openItemId === sheetItem.id}
          onOpenChange={(open) => (open ? setOpenItemId(sheetItem.id) : closeSheet())}
          saveState={saveState}
          canMoveUp={!hasPending && sheetIndex > 0}
          canMoveDown={!hasPending && sheetIndex < items.length - 1}
          onChange={(settings) => changeSettings(sheetItem.id, settings)}
          onMove={(delta) => moveBy(sheetItem.id, delta)}
          onRemove={() => removeExercise(sheetItem.id)}
        />
      )}

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={strings.plans.picker.title}
        exercises={exercises}
        excludeIds={items.map((item) => item.exercise.id)}
        onSelect={(exercise) => void addExercise(exercise)}
      />
    </>
  );
}
