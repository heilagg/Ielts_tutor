import Link from "next/link";
import { requireProfile } from "@/lib/guards";
import { NAV_ITEMS } from "@/components/nav/navItems";
import { Card } from "@/components/ui/Card";

export default async function MorePage() {
  await requireProfile();
  const items = NAV_ITEMS.filter((i) => !i.primary);

  return (
    <div className="max-w-lg mx-auto px-5 py-8 md:py-10 md:hidden">
      <h1 className="text-2xl font-semibold mb-6">More</h1>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="flex flex-col items-center justify-center py-8 gap-2 text-center">
                <Icon size={22} className="text-[var(--color-primary-2)]" />
                <span className="text-sm font-medium">{item.label}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
