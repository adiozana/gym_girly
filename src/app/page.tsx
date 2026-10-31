import { strings } from "@/lib/strings";

// Placeholder until the dashboard is built (stage 5).
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-2 px-5">
      <h1 className="text-title font-semibold">{strings.home.setupTitle}</h1>
      <p className="text-ink-muted">{strings.home.setupBody}</p>
    </main>
  );
}
