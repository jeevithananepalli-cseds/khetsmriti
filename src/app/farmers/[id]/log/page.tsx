import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/Icons";
import { LogVisitFlow } from "@/components/log/LogVisitFlow";
import { findFarmer, findVillage, products } from "@/lib/data";

export default async function LogVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const farmer = findFarmer(id);
  const village = farmer && findVillage(farmer.villageId);
  if (!farmer || !village) notFound();

  return (
    <div className="grid gap-4">
      <Link href={`/farmers/${id}`} className="flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeftIcon /> {farmer.name}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Log visit</h1>
        <p className="text-sm text-muted">
          {farmer.name} · {village.name}. Speak or type what you saw and advised, in Telugu or English.
        </p>
      </div>
      <LogVisitFlow farmer={farmer} catalogue={[...products]} />
    </div>
  );
}
