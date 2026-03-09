import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  deleteAdminCustomerUser,
  listAdminCustomerUserLogs,
  listAdminCustomerUsers,
  updateAdminCustomerUser,
} from "../../../../../lib/db/admin-customer-users";
import { CustomerAccountDeletionError } from "../../../../../lib/db/customer-account-deletion";
import { isUiMaintenanceLockedError } from "../../../../../lib/maintenance/ui-maintenance-guard";
import { takeRateLimitToken } from "../../../../../lib/security/rate-limit";

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
  const token = takeRateLimitToken(`admin-customer-users:${action}:${ip}`, {
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
      },
    );
  }

  return null;
}

function mapStatus(message: string) {
  if (message === "userId is required") {
    return 400;
  }
  if (message === "Customer user not found.") {
    return 404;
  }
  if (message === "Unauthorized") {
    return 401;
  }
  if (message === "Only admin can manage users" || message === "Not authorized to manage users") {
    return 403;
  }
  if (message.includes("Too many OTP requests")) {
    return 429;
  }
  if (message === "Network unstable") {
    return 503;
  }
  return 500;
}

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request, "GET");
  if (limited) {
    return limited;
  }

  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (userId) {
      const logs = await listAdminCustomerUserLogs(userId);
      return NextResponse.json({ logs }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }
    const users = await listAdminCustomerUsers();
    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load customer users";
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
    const data = await updateAdminCustomerUser(body);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (isUiMaintenanceLockedError(error)) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    }
    if (error instanceof CustomerAccountDeletionError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to update customer user";
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
    const data = await deleteAdminCustomerUser(body);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (isUiMaintenanceLockedError(error)) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    }
    if (error instanceof CustomerAccountDeletionError) {
      return NextResponse.json({ code: error.code, error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to delete customer user";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}
