"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { NAV_ITEMS } from "./navItems";

export function BottomNav() {
  const pathname = usePathname();
  const primaryItems = NAV_ITEMS.filter((i) => i.primary);
  const isMoreActive = NAV_ITEMS.filter((i) => !i.primary).some((i) => pathname.startsWith(i.href));

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur border-t border-[var(--color-border)] safe-bottom"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5 h-16">
        {primaryItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex">
              <Link
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11"
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 1.8}
                  color={active ? "var(--color-primary-2)" : "var(--color-text-muted)"}
                />
                <span
                  className="text-[11px] leading-none"
                  style={{ color: active ? "var(--color-primary-2)" : "var(--color-text-muted)" }}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex">
          <Link
            href="/more"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-11 min-h-11"
          >
            <MoreHorizontal
              size={22}
              strokeWidth={isMoreActive ? 2.4 : 1.8}
              color={isMoreActive ? "var(--color-primary-2)" : "var(--color-text-muted)"}
            />
            <span
              className="text-[11px] leading-none"
              style={{ color: isMoreActive ? "var(--color-primary-2)" : "var(--color-text-muted)" }}
            >
              More
            </span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
