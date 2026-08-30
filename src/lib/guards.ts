import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/lib/session";

/** Home/Study/Practice/Mock/Progress all require a completed diagnostic before they're meaningful. */
export async function requireDiagnosticComplete() {
  const user = await getCurrentUserWithProfile();
  if (!user?.profile) redirect("/onboarding");
  if (!user.profile.diagnosticComplete) redirect("/diagnostic");
  return user as NonNullable<typeof user> & { profile: NonNullable<typeof user.profile> };
}

export async function requireProfile() {
  const user = await getCurrentUserWithProfile();
  if (!user?.profile) redirect("/onboarding");
  return user as NonNullable<typeof user> & { profile: NonNullable<typeof user.profile> };
}
