"use client";

import { ErrorState } from "@/components/ui";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="This screen could not load"
      message="Something went wrong while loading. Your data is safe — try again."
      onRetry={reset}
    />
  );
}
