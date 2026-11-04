import { cookies } from "next/headers";
import { isDemoMode } from "@/server/config";
import { pairScreen, SCREEN_COOKIE, SCREEN_COOKIE_MAX_AGE } from "@/server/screens";

/** The tablet sends the code shown in the Admin and gets a long-lived Screen cookie back. */
export async function POST(request: Request) {
  if (isDemoMode()) return Response.json({ ok: true });
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  const result = await pairScreen(code);
  if (!result) return Response.json({ error: "invalid_code" }, { status: 400 });

  (await cookies()).set(SCREEN_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SCREEN_COOKIE_MAX_AGE,
  });
  return Response.json({ ok: true });
}
