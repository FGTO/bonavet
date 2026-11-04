import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth";
import { isAuthConfigured } from "@/server/config";

function notConfigured() {
  return Response.json({ error: "auth_not_configured" }, { status: 503 });
}

export async function GET(request: Request) {
  return isAuthConfigured() ? toNextJsHandler(getAuth()).GET(request) : notConfigured();
}

export async function POST(request: Request) {
  return isAuthConfigured() ? toNextJsHandler(getAuth()).POST(request) : notConfigured();
}
