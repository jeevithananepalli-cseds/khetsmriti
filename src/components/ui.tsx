import clsx from "clsx";
import Link from "next/link";
import { AlertIcon, RefreshIcon } from "./Icons";

// Small presentational building blocks shared by every screen.

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={clsx("rounded-2xl border border-line bg-surface p-4 shadow-sm", className)}>{children}</section>;
}

export function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

type Tone = "leaf" | "soil" | "turmeric" | "sky" | "danger" | "neutral";

const TONES: Record<Tone, string> = {
  leaf: "bg-leaf-soft text-leaf-strong",
  soil: "bg-soil-soft text-soil",
  turmeric: "bg-turmeric-soft text-turmeric",
  sky: "bg-sky-soft text-sky",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-bg text-muted border border-line",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-50";

export const buttonClass = {
  primary: clsx(BUTTON_BASE, "bg-leaf text-white hover:bg-leaf-strong"),
  secondary: clsx(BUTTON_BASE, "border border-line bg-surface text-ink hover:bg-bg"),
  ghost: clsx(BUTTON_BASE, "text-leaf hover:bg-leaf-soft"),
};

export function LinkButton({ href, variant = "primary", className, children }: {
  href: string;
  variant?: keyof typeof buttonClass;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={clsx(buttonClass[variant], className)}>
      {children}
    </Link>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-line/70", className)} />;
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
      <div className="flex items-start gap-2">
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-danger/90">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className={clsx(buttonClass.secondary, "mt-3 w-full sm:w-auto")}>
          <RefreshIcon /> Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 p-6 text-center text-sm text-muted">
      <p className="font-semibold text-ink">{title}</p>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

export function DateChip({ date, className }: { date: string; className?: string }) {
  return (
    <Badge tone="turmeric" className={clsx("font-mono", className)}>
      {date}
    </Badge>
  );
}
