import "server-only";

import { z } from "zod";

import { requireAdminApi } from "../auth/admin";
import { getSupabaseServiceRoleClient } from "../supabase/service";

export type AdminUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "staff";
  createdAt: string | null;
};

const CreateAdminUserSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อผู้ใช้ / Display name is required")
    .max(120, "ชื่อผู้ใช้ยาวเกินไป / Display name is too long"),
  email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง / Invalid email format"),
  password: z
    .string()
    .trim()
    .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร / Password must be at least 6 characters")
    .max(128, "รหัสผ่านยาวเกินไป / Password is too long"),
  role: z.enum(["admin", "staff"]),
});

const UpdateAdminUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "staff"]),
  displayName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().trim().min(6).max(128).optional(),
});

const DeleteAdminUserSchema = z.object({
  userId: z.string().uuid(),
});

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message || fallback);
  }
  return fallback;
}

function mapCreateAuthError(error: unknown) {
  const raw = errorText(error, "Unknown error");
  const message = raw.toLowerCase();

  if (
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("user already registered") ||
    message.includes("already exists")
  ) {
    return "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น";
  }

  return `Failed to create auth user: ${raw}`;
}

function isMissingProfileColumnError(error: unknown) {
  const message = errorText(error, "").toLowerCase();
  return (
    message.includes("column") &&
    (message.includes("does not exist") ||
      message.includes("could not find") ||
      message.includes("schema cache"))
  );
}

async function assertAdminRole() {
  await requireAdminApi();
}

export async function createAdminUser(input: unknown) {
  await assertAdminRole();
  const parsed = CreateAdminUserSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();

  const created = await supabase.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: {
      display_name: parsed.displayName,
      full_name: parsed.displayName,
    },
  });

  if (created.error || !created.data.user) {
    throw new Error(mapCreateAuthError(created.error));
  }

  const userId = created.data.user.id;
  const profilePayloads: Array<Record<string, unknown>> = [
    {
      id: userId,
      role: parsed.role,
      email: parsed.email,
      full_name: parsed.displayName,
      display_name: parsed.displayName,
    },
    {
      id: userId,
      role: parsed.role,
      email: parsed.email,
      display_name: parsed.displayName,
    },
    {
      id: userId,
      role: parsed.role,
      full_name: parsed.displayName,
    },
    {
      id: userId,
      role: parsed.role,
    },
  ];

  let upsertError: unknown = null;
  for (const payload of profilePayloads) {
    const attempt = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    if (!attempt.error) {
      upsertError = null;
      break;
    }

    upsertError = attempt.error;
    if (isMissingProfileColumnError(attempt.error)) {
      continue;
    }
    break;
  }

  if (upsertError) {
    await supabase.auth.admin.deleteUser(userId);
    throw new Error(
      `Failed to assign role in profiles: ${errorText(upsertError, "Unknown error")}`,
    );
  }

  return {
    id: userId,
    email: parsed.email,
    role: parsed.role,
  };
}

function toDisplayName(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function toRole(value: unknown): "admin" | "staff" {
  return value === "admin" ? "admin" : "staff";
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  await assertAdminRole();
  const supabase = getSupabaseServiceRoleClient();

  const listed = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (listed.error) {
    throw new Error(`Failed to load users: ${errorText(listed.error, "Unknown error")}`);
  }

  const authUsers = listed.data.users ?? [];
  const ids = authUsers.map((item) => item.id);
  const rolesByUserId = new Map<string, "admin" | "staff">();
  const namesByUserId = new Map<string, string>();

  if (ids.length > 0) {
    const profiles = await supabase
      .from("profiles")
      .select("id,role,display_name,full_name")
      .in("id", ids);

    if (profiles.error && !isMissingProfileColumnError(profiles.error)) {
      throw new Error(`Failed to load profiles: ${errorText(profiles.error, "Unknown error")}`);
    }

    if (!profiles.error && profiles.data) {
      for (const row of profiles.data as Array<Record<string, unknown>>) {
        const userId = String(row.id ?? "");
        if (!userId) {
          continue;
        }
        rolesByUserId.set(userId, toRole(row.role));
        namesByUserId.set(
          userId,
          toDisplayName(row.display_name, toDisplayName(row.full_name, "")),
        );
      }
    }
  }

  return authUsers.map((user) => {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const nameFromMetadata = toDisplayName(
      metadata.display_name,
      toDisplayName(metadata.full_name, user.email ?? user.id),
    );

    return {
      id: user.id,
      email: user.email ?? "-",
      displayName: namesByUserId.get(user.id) || nameFromMetadata,
      role: rolesByUserId.get(user.id) ?? "staff",
      createdAt: user.created_at ?? null,
    };
  });
}

export async function updateAdminUser(input: unknown) {
  await assertAdminRole();
  const parsed = UpdateAdminUserSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();

  const profilePayloads: Array<Record<string, unknown>> = [
    {
      id: parsed.userId,
      role: parsed.role,
      display_name: parsed.displayName,
      full_name: parsed.displayName,
    },
    {
      id: parsed.userId,
      role: parsed.role,
      display_name: parsed.displayName,
    },
    {
      id: parsed.userId,
      role: parsed.role,
      full_name: parsed.displayName,
    },
    {
      id: parsed.userId,
      role: parsed.role,
    },
  ];

  let upsertError: unknown = null;
  for (const payload of profilePayloads) {
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
    const attempt = await supabase.from("profiles").upsert(cleanedPayload, { onConflict: "id" });
    if (!attempt.error) {
      upsertError = null;
      break;
    }

    upsertError = attempt.error;
    if (isMissingProfileColumnError(attempt.error)) {
      continue;
    }
    break;
  }

  if (upsertError) {
    throw new Error(`Failed to update user: ${errorText(upsertError, "Unknown error")}`);
  }

  const authPayload: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, string>;
  } = {};

  if (parsed.email) {
    authPayload.email = parsed.email;
  }
  if (parsed.password) {
    authPayload.password = parsed.password;
  }
  if (parsed.displayName) {
    authPayload.user_metadata = {
      display_name: parsed.displayName,
      full_name: parsed.displayName,
    };
  }

  if (Object.keys(authPayload).length > 0) {
    const updatedAuth = await supabase.auth.admin.updateUserById(parsed.userId, authPayload);
    if (updatedAuth.error) {
      throw new Error(`Failed to update auth profile: ${errorText(updatedAuth.error, "Unknown error")}`);
    }
  }

  return { ok: true };
}

export async function deleteAdminUser(input: unknown) {
  await assertAdminRole();
  const parsed = DeleteAdminUserSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();

  const deleted = await supabase.auth.admin.deleteUser(parsed.userId);
  if (deleted.error) {
    throw new Error(`Failed to delete user: ${errorText(deleted.error, "Unknown error")}`);
  }

  await supabase.from("profiles").delete().eq("id", parsed.userId);
  return { ok: true };
}
