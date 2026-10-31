# Design system — project decisions

Base: the `adi-ux-ui` skill ("Blush Porcelain"). This file records only what this project decides on top of it.
SPEC.md defines what each screen does; the skill defines how it looks. Where SPEC.md and the skill differ on code structure, SPEC.md wins.

## Project
- App name: "יומן אימונים" (gym training log). Mobile-only, RTL, light theme only.
- Tokens: `src/app/globals.css` (skill appendix, plus the shadcn CSS variables mapped to the brand colors). Font: Assistant via `next/font/google`.

## Deviations from the skill defaults (from SPEC.md)
- **UI strings:** one file, `src/lib/strings.ts`, instead of per-feature `copy.ts`.
- **Folder structure:** SPEC.md's `src/app/(auth)`, `src/app/(app)`, `src/components`, `src/lib/{calc,supabase,validation}` instead of `features/`.
- **Icons:** Heroicons only. shadcn's `iconLibrary` is still `lucide` in `components.json`; replace lucide icons in any added shadcn component and remove `lucide-react` if it gets installed.

## Navigation (SPEC.md)
- Bottom tab bar, four tabs: בית, תוכניות, היסטוריה, תרגילים. Settings opens from an icon in the home header. Hidden during an active workout.

## Open
- Motion library (`motion`) is in the skill's stack but not in SPEC.md's; decide when the first animated UI is built.
