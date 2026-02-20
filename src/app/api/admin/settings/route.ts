import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAdminSettings, updateAdminSetting } from "../../../../../lib/db/admin-settings";

export async function GET() {
  try {
    const settings = await getAdminSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { field?: unknown; value?: unknown };
    const settings = await updateAdminSetting(body.field, body.value);
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues.map((item) => item.message).join(", ");
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
