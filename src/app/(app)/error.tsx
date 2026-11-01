"use client";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-4">
      <p className="text-section font-medium">{strings.errors.pageTitle}</p>
      <Button variant="outline" onClick={() => retry()}>
        {strings.errors.retry}
      </Button>
    </div>
  );
}
