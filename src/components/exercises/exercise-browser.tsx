"use client";

import { ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { Chip } from "@/components/shared/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { filterExercises } from "@/lib/exercises/filter";
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type ExerciseSummary, type MuscleGroup } from "@/lib/exercises/types";
import { strings } from "@/lib/strings";

type ExerciseBrowserProps = {
  exercises: ExerciseSummary[];
  // Library mode links each row; picker mode calls onSelect instead.
  hrefFor?: (exercise: ExerciseSummary) => string;
  onSelect?: (exercise: ExerciseSummary) => void;
  emptyAction?: ReactNode;
  autoFocus?: boolean;
};

export function ExerciseBrowser({ exercises, hrefFor, onSelect, emptyAction, autoFocus }: ExerciseBrowserProps) {
  const [query, setQuery] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  // Keeps typing responsive while the list re-filters.
  const deferredQuery = useDeferredValue(query);

  const results = useMemo(
    () => filterExercises(exercises, { query: deferredQuery, muscleGroup, equipment }),
    [exercises, deferredQuery, muscleGroup, equipment],
  );

  return (
    <div className="flex flex-col">
      <div className="relative">
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-4 my-auto size-5 text-ink-subtle"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={strings.exercises.searchPlaceholder}
          aria-label={strings.exercises.searchLabel}
          dir="auto"
          enterKeyHint="search"
          autoFocus={autoFocus}
          className="ps-11"
        />
      </div>

      <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
        <Chip selected={muscleGroup === null} aria-pressed={muscleGroup === null} onClick={() => setMuscleGroup(null)}>
          {strings.exercises.allMuscles}
        </Chip>
        {MUSCLE_GROUPS.map((group) => (
          <Chip
            key={group}
            selected={muscleGroup === group}
            aria-pressed={muscleGroup === group}
            onClick={() => setMuscleGroup(muscleGroup === group ? null : group)}
          >
            {strings.muscleGroups[group]}
          </Chip>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex min-h-11 items-center gap-1 self-start text-label font-medium text-rose-deep active:opacity-70"
            />
          }
        >
          {strings.exercises.equipmentFilter}: {equipment ? strings.equipment[equipment] : strings.exercises.equipmentAll}
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setEquipment(null)}>{strings.exercises.equipmentAll}</DropdownMenuItem>
          <DropdownMenuSeparator />
          {EQUIPMENT.map((item) => (
            <DropdownMenuItem key={item} onClick={() => setEquipment(item)}>
              {strings.equipment[item]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="font-medium">{strings.exercises.noResults}</p>
          <p className="text-ink-muted">{strings.exercises.noResultsHint}</p>
          {emptyAction}
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {results.map((exercise) => (
            <li key={exercise.id} className="[contain-intrinsic-size:auto_64px] [content-visibility:auto]">
              <ExerciseRow exercise={exercise} href={hrefFor?.(exercise)} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExerciseRow({
  exercise,
  href,
  onSelect,
}: {
  exercise: ExerciseSummary;
  href?: string;
  onSelect?: (exercise: ExerciseSummary) => void;
}) {
  const content = (
    <>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          <span className="wrap-break-word">{exercise.name_he}</span>
          {exercise.is_personal && (
            <span className="shrink-0 rounded-sm bg-blush px-1.5 text-caption text-ink-muted">
              {strings.exercises.personalBadge}
            </span>
          )}
        </span>
        <span className="text-caption text-ink-muted">
          {strings.muscleGroups[exercise.muscle_group]} · {strings.equipment[exercise.equipment]}
        </span>
      </span>
      {href && <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-subtle rtl:-scale-x-100" />}
    </>
  );
  const className = "flex min-h-16 w-full items-center gap-3 py-2 text-start transition-colors active:bg-blush/60";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => onSelect?.(exercise)}>
      {content}
    </button>
  );
}
