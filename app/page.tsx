import { Suspense } from "react";
import { LogsView } from "./logs-view";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading…</p>}>
      <LogsView />
    </Suspense>
  );
}
