import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "ielts_uid";

/** Reads the anonymous device/user id set by middleware. Present on every matched route. */
export async function getUserId(): Promise<string> {
  const store = await cookies();
  const uid = store.get(COOKIE_NAME)?.value;
  if (!uid) {
    throw new Error(
      "No session cookie found. This route must be reached through the Next.js middleware (any normal page/API request)."
    );
  }
  return uid;
}

/** Ensures a User row exists for the current session and returns it. */
export async function getOrCreateUser() {
  const id = await getUserId();
  return prisma.user.upsert({
    where: { id },
    update: {},
    create: { id },
  });
}

/** Fetches the current user with profile, or null if onboarding hasn't run. */
export async function getCurrentUserWithProfile() {
  const id = await getUserId();
  return prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });
}
