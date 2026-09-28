import { FarmersList } from "@/components/FarmersList";
import { villages } from "@/lib/data";
import { listFarmerSummaries } from "@/lib/farmers";

export const dynamic = "force-dynamic";

export default async function FarmersPage() {
  const farmers = await listFarmerSummaries();
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Farmers</h1>
      <p className="mt-1 text-sm text-muted">
        Pick a farmer to get a pre-visit brief built from everything KhetSmriti remembers.
      </p>
      <div className="mt-4">
        <FarmersList farmers={farmers} villages={[...villages]} />
      </div>
    </div>
  );
}
