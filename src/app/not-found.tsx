import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { strings } from "@/lib/strings";

// A missing page stays inside the app's look, with a clear way back (design skill).
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <p className="text-section font-medium">{strings.errors.notFound}</p>
      <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
        {strings.errors.backHome}
      </Link>
    </main>
  );
}
