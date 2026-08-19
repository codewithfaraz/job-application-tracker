"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/components/ui/cn";

const workspaceItems = [
  { href: "/dashboard", label: "Dashboard", code: "DB" },
  { href: "/applications", label: "Applications", code: "AP" },
  { href: "/pipeline", label: "Pipeline", code: "PL" },
  { href: "/calendar", label: "Calendar", code: "CA" },
];

const reviewItems = [
  { href: "/analytics", label: "Analytics", code: "AN" },
  { href: "/resumes", label: "Resumes", code: "CV" },
  { href: "/settings", label: "Settings", code: "ST" },
];

type NavItem = (typeof workspaceItems)[number];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, mobile = false }: { item: NavItem; mobile?: boolean }) {
  const pathname = usePathname();
  const current = isCurrentPath(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-md border border-transparent text-sm font-medium text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        mobile ? "h-10 shrink-0 px-3" : "h-10 px-3",
        current
          ? "border-[#c8d5fb] bg-cobalt-soft text-accent-foreground"
          : "hover:border-border hover:bg-paper hover:text-evergreen-deep",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-6 place-items-center rounded-sm border font-mono text-[0.57rem] font-semibold tracking-wide",
          current
            ? "border-[#b6c7f7] bg-white/60 text-cobalt"
            : "border-border bg-transparent text-muted-foreground group-hover:text-evergreen",
        )}
      >
        {item.code}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

function AppNav({ mode = "sidebar" }: { mode?: "sidebar" | "mobile" }) {
  if (mode === "mobile") {
    return (
      <nav aria-label="Primary navigation" className="overflow-x-auto px-3 py-2">
        <ul className="flex min-w-max gap-1">
          {[...workspaceItems, ...reviewItems].map((item) => (
            <li key={item.href}>
              <NavLink item={item} mobile />
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Primary navigation" className="space-y-7">
      <NavGroup label="Workspace" items={workspaceItems} />
      <NavGroup label="Review & setup" items={reviewItems} />
    </nav>
  );
}

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <div>
      <p className="mb-2 px-3 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export { AppNav };
