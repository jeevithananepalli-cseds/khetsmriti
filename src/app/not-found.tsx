import { EmptyState, LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid gap-4">
      <EmptyState title="Not found">That farmer or page does not exist.</EmptyState>
      <LinkButton href="/" variant="secondary">
        Back to farmers
      </LinkButton>
    </div>
  );
}
