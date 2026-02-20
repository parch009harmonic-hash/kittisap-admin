import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createAdminUser, deleteAdminUser, listAdminUsers, updateAdminUser } from "../../../../../lib/db/admin-users";

function mapStatus(message: string) {
  if (message === "Unauthorized") {
    return 401;
  }
  if (message === "Only admin can manage users" || message === "Not authorized to manage users") {
    return 403;
  }
  return 500;
}

export async function GET() {
  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    const user = await createAdminUser(body);
    return NextResponse.json({ user });
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
  try {
    const body = (await request.json()) as unknown;
    await updateAdminUser(body);
    return NextResponse.json({ ok: true });
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
  try {
    const body = (await request.json()) as unknown;
    await deleteAdminUser(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: mapStatus(message) });
  }
}
