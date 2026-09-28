"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LeafIcon } from "./Icons";

const NAV = [
  { href: "/", label: "Farmers", match: (p: string) => p === "/" || p.startsWith("/farmers") },
  { href: "/insights", label: "Insights", match: (p: string) => p.startsWith("/insights") },
  { href: "/demo", label: "Demo", match: (p: string) => p.startsWith("/demo") },
];

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-leaf text-white">
            <LeafIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">KhetSmriti</span>
        </Link>
        <nav className="ml-auto flex gap-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "rounded-lg px-2.5 py-1.5 font-medium",
                item.match(pathname) ? "bg-leaf-soft text-leaf-strong" : "text-muted hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
