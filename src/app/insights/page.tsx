import { InsightsView } from "@/components/InsightsView";
import { villages } from "@/lib/data";

export default function InsightsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Village insights</h1>
      <p className="mt-1 text-sm text-muted">
        Hindsight reflects on every visit and outcome remembered in a village to tell officers what actually works there.
      </p>
      <div className="mt-4">
        <InsightsView villages={[...villages]} />
      </div>
    </div>
  );
}
