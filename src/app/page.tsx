import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/lib/session";

export default async function RootPage() {
  const user = await getCurrentUserWithProfile();
  if (!user || !user.profile || !user.profile.onboardingComplete) {
    redirect("/onboarding");
  }
  if (!user.profile.diagnosticComplete) {
    redirect("/diagnostic");
  }
  redirect("/home");
}
