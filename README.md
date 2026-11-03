# יומן אימונים

אפליקציית ווב לתיעוד אימוני כוח, מותאמת לטלפון. מסמך הבנייה המלא: [SPEC.md](SPEC.md).

**סטאק:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase · Zod · Vitest

## דרישות מוקדמות

- Node.js 22 ומעלה
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- Docker פעיל (בשביל Supabase מקומי)

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # ממלאים את הערכים (ראו בהמשך)
supabase start               # מרים Postgres + Auth מקומיים, מריץ migrations ו-seed
npm run dev                  # http://localhost:3000
```

ב-`.env.local` שמים את הכתובת ואת ה-publishable key של Supabase:

- **מקומי:** `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` והמפתח `PUBLISHABLE_KEY` מהפלט של `supabase status`.
- **ענן:** מ-Project Settings → API בפרויקט ב-Supabase.

## מסד הנתונים

- סכמה ו-RLS: `supabase/migrations/`
- ספריית התרגילים המובנית (80 תרגילים): `supabase/seed.sql`
- טיפוסי TypeScript שנוצרים מהמסד: `src/lib/supabase/database.types.ts`

| פקודה | מה היא עושה |
| --- | --- |
| `npm run db:reset` | בונה את המסד המקומי מאפס: כל ה-migrations ואז ה-seed |
| `npm run db:test` | בדיקות pgTAP: RLS על כל הטבלאות, כיסוי ה-seed ובידוד בין משתמשים |
| `npm run db:types` | יוצר מחדש את טיפוסי ה-TypeScript מהמסד המקומי |

אחרי שינוי סכמה: יוצרים migration חדש עם `supabase migration new <name>`, מריצים `npm run db:reset` ו-`npm run db:types`.

### פרויקט בענן

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push --include-seed     # migrations + seed
```

בהגדרות ה-Auth של הפרויקט בענן: לכבות **Confirm email** ולקבוע אורך סיסמה מינימלי 8 (ההרשמה היא עם שם משתמש בלבד).

## בדיקות ואיכות

| פקודה | מה היא עושה |
| --- | --- |
| `npm test` | בדיקות יחידה (Vitest) |
| `npm run test:integration` | בדיקות אינטגרציה מול Supabase המקומי: הרשמה, התחברות ובידוד בין משתמשים (דורש `supabase start`) |
| `npm run test:e2e` | בדיקת הזרימה המלאה ב-Playwright: בונה ומריץ את האפליקציה על פורט 3100 מול Supabase המקומי (דורש `supabase start`) |
| `npm run typecheck` | בדיקת טיפוסים (TypeScript strict) |
| `npm run lint` | ESLint |
| `npm run build` | build לפרודקשן |

## דיפלוי

האפליקציה מחוברת ל-Vercel דרך ה-repo ב-GitHub: כל push ל-`main` מעלה גרסה חדשה.
משתני הסביבה ב-Vercel הם אלה שב-`.env.example`: שני משתני Supabase עם הערכים של הפרויקט בענן, ו-`GEMINI_API_KEY` לעוזר "בניית תוכנית בטקסט חופשי" (בצד השרת בלבד).
שינויי סכמה עולים לענן בנפרד: `supabase db push --linked` (ועם `--include-seed` כשהספרייה המובנית משתנה).

## התקנה על הטלפון

פותחים את כתובת האפליקציה בדפדפן ובוחרים "הוספה למסך הבית" (ב-iPhone: כפתור השיתוף ב-Safari).
