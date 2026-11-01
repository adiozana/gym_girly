# Design system — project decisions

Base: the `adi-ux-ui` skill ("Blush Porcelain"). This file records only what this project decides on top of it.
SPEC.md defines what each screen does; the skill defines how it looks. Where SPEC.md and the skill differ on code structure, SPEC.md wins.

## Project
- App name: "יומן אימונים" (gym training log). Mobile-only, RTL, light theme only.
- Tokens: `src/app/globals.css` (skill appendix, plus the shadcn CSS variables mapped to the brand colors). Font: Assistant via `next/font/google`.

## Deviations from the skill defaults (from SPEC.md)
- **UI strings:** one file, `src/lib/strings.ts`, instead of per-feature `copy.ts`.
- **Folder structure:** SPEC.md's `src/app/(auth)`, `src/app/(app)`, `src/components`, `src/lib/{calc,supabase,validation}` instead of `features/`.
- **Icons:** Heroicons only. shadcn's `iconLibrary` is still `lucide` in `components.json`; replace lucide icons in any added shadcn component and remove `lucide-react` (and `next-themes`, which the sonner template pulls in) if they get installed.

## Navigation (SPEC.md)
- Bottom tab bar, four tabs: בית, תוכניות, היסטוריה, תרגילים. Settings opens from an icon in the home header. Hidden during an active workout.
- Tab icons (outline, solid when active): Home, ClipboardDocumentList, CalendarDays, BookOpen.

## Terminology (decided with Adi, stage 2)
- UI says **תוכנית** for a workout template (never "תבנית"); code and DB keep `template`.

## Patterns (decided with Adi, stage 2)
- **Plan editor:** compact rows (name, "3 × 8–12", current weight, drag handle); tapping a row opens a bottom sheet with all its settings. Reorder by dragging the handle (`@dnd-kit`), with "הזזה למעלה/למטה" in the sheet as the accessible alternative.
- **Archive:** a toast with "ביטול" right after archiving, and a collapsed "בארכיון (n)" section at the bottom of the list where items can be restored. Applies to plans and personal exercises.
- **Small deletes** (an exercise from a plan) happen at once with an undo toast; **irreversible deletes** (a personal exercise) use a confirmation dialog with the solid `danger` button.
- Choice from a short fixed list (muscle group, equipment) → wrapping chips (`ChoiceChips`); a filter row of chips scrolls horizontally.
- Editor settings save as they change (500ms debounce), with a quiet "שומר / נשמר" line under the sheet title.

## Patterns (stage 3, active workout)
- **Workout screen:** sticky glass header (back home, name, elapsed time, quiet "שומר / נשמר", "לא נשמר · ניסיון חוזר" in `warning`) and a sticky glass bottom bar ("הוספת תרגיל" outline, "שמירת אימון" primary). Bottom tab bar hidden.
- **Exercise row:** compact row, not a card: name (tap opens the accordion), small "3 × 8–12", ONE weight field, ONE reps field, and a 48px done toggle. Suggestions are placeholders in `ink-muted`; entered values are `font-medium ink`. Done = `success` toggle with a white check on a `success/10` row; tapping again un-marks.
- **Accordion:** opens downward under the row via a `grid-rows-[0fr]` → `grid-rows-[1fr]` transition; one open at a time. Contains instructions, the 2 alternatives (swap/add), last time, sets −/+, note, move up/down and remove. Removing an exercise is undone from a toast.

## Open
- Motion library (`motion`) is in the skill's stack but not in SPEC.md's; decide when the first animated UI is built.
