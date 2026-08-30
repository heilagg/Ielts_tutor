import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/lib/session";
import { SideNav } from "@/components/nav/SideNav";
import { BottomNav } from "@/components/nav/BottomNav";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserWithProfile();
  if (!user || !user.profile || !user.profile.onboardingComplete) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-w-0 pb-safe-nav md:pb-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
