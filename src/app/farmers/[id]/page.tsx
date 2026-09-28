import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefView } from "@/components/brief/BriefView";
import { FarmerHeader } from "@/components/FarmerHeader";
import { ArrowLeftIcon, MicIcon } from "@/components/Icons";
import { LinkButton } from "@/components/ui";
import { VisitRecords } from "@/components/VisitRecords";
import { products } from "@/lib/data";
import { getFarmerDetail } from "@/lib/farmers";

export const dynamic = "force-dynamic";

export default async function FarmerBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getFarmerDetail(id);
  if (!detail) notFound();

  return (
    <div className="grid gap-5">
      <Link href="/" className="flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeftIcon /> Farmers
      </Link>
      <FarmerHeader summary={detail} />
      <LinkButton href={`/farmers/${id}/log`} className="w-full">
        <MicIcon /> Log this visit
      </LinkButton>
      <BriefView farmerId={id} catalogue={[...products]} />
      <VisitRecords visits={detail.visits} outcomes={detail.outcomes} catalogue={[...products]} />
    </div>
  );
}
