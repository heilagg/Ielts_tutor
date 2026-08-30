"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav
      className="hidden md:flex md:flex-col md:w-60 md:shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] h-screen sticky top-0 p-4"
      aria-label="Primary"
    >
      <div className="flex items-center gap-2 px-2 py-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold">
          7.5
        </div>
        <span className="font-semibold tracking-tight">IELTS Coach</span>
      </div>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
                style={{
                  background: active ? "var(--color-surface-2)" : "transparent",
                  color: active ? "var(--color-primary-2)" : "var(--color-text-muted)",
                  fontWeight: active ? 600 : 500,
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
