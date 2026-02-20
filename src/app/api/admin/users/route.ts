import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { takeRateLimitToken } from "../../../../../lib/security/rate-limit";
import { createAdminUser, deleteAdminUser, listAdminUsers, updateAdminUser } from "../../../../../lib/db/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(request: NextRequest, action: string) {
  const ip = getClientIp(request);
  const token = takeRateLimitToken(`admin-users:${action}:${ip}`, {
    limit: action === "GET" ? 45 : 20,
    windowMs: 60_000,
  });

  if (!token.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((token.resetAt - Date.now()) / 1000)),
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }

  return null;
}

function mapStatus(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }
  if (message === "Only admin can manage users" || message === "Not authorized to manage users") {
    return 403;
  }
  return 500;
}

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, "GET");
  if (limited) {
    return limited;
  }

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(request, "POST");
  if (limited) {
    return limited;
  }

  try {
    const body = (await request.json()) as unknown;
    const user = await createAdminUser(body);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}

export async function PATCH(request: NextRequest) {
  const limited = checkRateLimit(request, "PATCH");
  if (limited) {
    return limited;
  }

  try {
    const body = (await request.json()) as unknown;
    await updateAdminUser(body);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}

export async function DELETE(request: NextRequest) {
  const limited = checkRateLimit(request, "DELETE");
  if (limited) {
    return limited;
  }

  try {
    const body = (await request.json()) as unknown;
    await deleteAdminUser(body);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}
