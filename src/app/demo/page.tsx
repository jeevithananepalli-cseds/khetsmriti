import { notFound } from "next/navigation";
import { DemoView } from "@/components/demo/DemoView";
import { findFarmer, products, seedOutcomes, seedVisits } from "@/lib/data";
import { DEMO_FARMER_ID, replaySteps } from "@/lib/demo";
import { learningCurve } from "@/lib/learningCurve";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  const farmer = findFarmer(DEMO_FARMER_ID);
  if (!farmer) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">See the memory work</h1>
      <p className="mt-1 text-sm text-muted">
        KhetSmriti without memory is a generic chatbot. Watch the memory panel as each brief recalls, and each replay step
        retains, in Hindsight.
      </p>
      <div className="mt-5">
        <DemoView
          farmerId={farmer.id}
          farmerName={farmer.name}
          steps={replaySteps()}
          catalogue={[...products]}
          curve={learningCurve(seedVisits, seedOutcomes)}
        />
      </div>
    </div>
  );
}
