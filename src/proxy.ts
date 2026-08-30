import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "ielts_uid";
const ONE_YEAR = 60 * 60 * 24 * 365;

// This app is designed as a single personal student's private coach, not a
// multi-tenant product — so instead of a full login system we assign a durable
// anonymous device/user id on first visit and use it to key all data.
export function proxy(req: NextRequest) {
  const existing = req.cookies.get(COOKIE_NAME)?.value;
  if (existing) return NextResponse.next();

  // Set on the request too (not just the response) so the current request's
  // server components can already read the cookie via cookies().get(...).
  const uid = crypto.randomUUID();
  req.cookies.set(COOKIE_NAME, uid);
  const res = NextResponse.next({ request: req });
  res.cookies.set(COOKIE_NAME, uid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR,
    path: "/",
  });
  return res;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
};
