import "server-only";

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { requireAdminApi } from "../auth/admin";
import { getSupabaseServiceRoleClient } from "../supabase/service";

export type AdminUserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "staff" | "developer";
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
  role: z.enum(["admin", "staff", "developer"]),
  developerPin: z.string().trim().min(4).max(64).optional(),
});

const UpdateAdminUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "staff", "developer"]),
  displayName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  password: z.string().trim().min(6).max(128).optional(),
  developerPin: z.string().trim().min(4).max(64).optional(),
});

const DeleteAdminUserSchema = z.object({
  userId: z.string().uuid(),
  developerPin: z.string().trim().min(4).max(64).optional(),
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

function isProfilesRoleConstraintError(error: unknown) {
  const message = errorText(error, "").toLowerCase();
  return message.includes("profiles_role_check") || (message.includes("check constraint") && message.includes("role"));
}

function profilesRoleConstraintHint() {
  return [
    "ฐานข้อมูลยังไม่อนุญาต role 'developer' ในตาราง profiles (profiles_role_check).",
    "กรุณารัน SQL นี้ใน Supabase SQL Editor:",
    "alter table public.profiles drop constraint if exists profiles_role_check;",
    "alter table public.profiles add constraint profiles_role_check check (role in ('admin','staff','developer'));",
  ].join("\n");
}

async function assertAdminRole() {
  await requireAdminApi();
}

function getDeveloperPinSecret() {
  const value = process.env.ADMIN_DEVELOPER_PIN ?? process.env.DEVELOPER_ROLE_PIN ?? "";
  return value.trim();
}

function safePinEquals(input: string, secret: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(secret);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

function assertDeveloperPin(pin: string | undefined) {
  const secret = getDeveloperPinSecret();
  if (!secret) {
    throw new Error("Developer PIN is not configured");
  }
  if (!pin || !pin.trim()) {
    throw new Error("Developer PIN is required");
  }
  if (!safePinEquals(pin.trim(), secret)) {
    throw new Error("Developer PIN is invalid");
  }
}

export async function createAdminUser(input: unknown) {
  await assertAdminRole();
  const parsed = CreateAdminUserSchema.parse(input);
  if (parsed.role === "developer") {
    assertDeveloperPin(parsed.developerPin);
  }
  const supabase = getSupabaseServiceRoleClient();

  const created = await supabase.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: {
      display_name: parsed.displayName,
      full_name: parsed.displayName,
      role: parsed.role,
    },
  });

  if (created.error || !created.data.user) {
    throw new Error(mapCreateAuthError(created.error));
  }

  const userId = created.data.user.id;
  const profilePayloads: Array<Record<string, unknown>> = [
    {
      user_id: userId,
      role: parsed.role,
      email: parsed.email,
      full_name: parsed.displayName,
      display_name: parsed.displayName,
    },
    {
      user_id: userId,
      role: parsed.role,
      email: parsed.email,
      display_name: parsed.displayName,
    },
    {
      user_id: userId,
      role: parsed.role,
      full_name: parsed.displayName,
    },
    {
      user_id: userId,
      role: parsed.role,
    },
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

  const upsertError = await upsertProfileCompat(supabase, profilePayloads);

  if (upsertError) {
    await supabase.auth.admin.deleteUser(userId);
    if (isProfilesRoleConstraintError(upsertError)) {
      throw new Error(profilesRoleConstraintHint());
    }
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

function toRole(value: unknown): "admin" | "staff" | "developer" {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "admin" || normalized === "developer") {
    return normalized;
  }
  return "staff";
}

async function getProfileRole(userId: string) {
  const supabase = getSupabaseServiceRoleClient();
  const byId = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!byId.error && byId.data) {
    return toRole((byId.data as Record<string, unknown>).role);
  }

  const byUserId = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (byUserId.error) {
    throw new Error(`Failed to verify profile role: ${errorText(byUserId.error, "Unknown error")}`);
  }

  return toRole((byUserId.data as Record<string, unknown> | null)?.role);
}

async function upsertProfileCompat(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  payloads: Array<Record<string, unknown>>,
) {
  let upsertError: unknown = null;

  for (const payload of payloads) {
    const cleanedPayload = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    );
    const conflictKeys: Array<"id" | "user_id"> = [];
    if ("id" in cleanedPayload) {
      conflictKeys.push("id");
    }
    if ("user_id" in cleanedPayload) {
      conflictKeys.push("user_id");
    }
    if (conflictKeys.length === 0) {
      continue;
    }

    for (const onConflict of conflictKeys) {
      const attempt = await supabase.from("profiles").upsert(cleanedPayload, { onConflict });
      if (!attempt.error) {
        return null;
      }

      upsertError = attempt.error;
      if (isMissingProfileColumnError(attempt.error)) {
        continue;
      }
      return upsertError;
    }
  }

  return upsertError;
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
  const rolesByUserId = new Map<string, "admin" | "staff" | "developer">();
  const namesByUserId = new Map<string, string>();
  const emailsByUserId = new Map<string, string>();
  const createdAtByUserId = new Map<string, string | null>();

  if (ids.length > 0) {
    const profilesWithUserId = await supabase
      .from("profiles")
      .select("id,user_id,role,display_name,full_name,email,created_at")
      .in("id", ids);

    let profiles: { error: unknown; data: Array<Record<string, unknown>> | null } = {
      error: profilesWithUserId.error,
      data: (profilesWithUserId.data as Array<Record<string, unknown>> | null) ?? null,
    };
    if (profilesWithUserId.error && isMissingProfileColumnError(profilesWithUserId.error)) {
      const fallbackProfiles = await supabase
        .from("profiles")
        .select("id,role,display_name,full_name,email,created_at")
        .in("id", ids);
      profiles = {
        error: fallbackProfiles.error,
        data: (fallbackProfiles.data as Array<Record<string, unknown>> | null) ?? null,
      };
    }

    if (profiles.error && !isMissingProfileColumnError(profiles.error)) {
      throw new Error(`Failed to load profiles: ${errorText(profiles.error, "Unknown error")}`);
    }

    if (!profiles.error && profiles.data) {
      for (const row of profiles.data as Array<Record<string, unknown>>) {
        const userId = String(row.user_id ?? row.id ?? "");
        if (!userId) {
          continue;
        }
        rolesByUserId.set(userId, toRole(row.role));
        namesByUserId.set(
          userId,
          toDisplayName(row.display_name, toDisplayName(row.full_name, "")),
        );
        emailsByUserId.set(userId, toDisplayName(row.email, ""));
        createdAtByUserId.set(userId, typeof row.created_at === "string" ? row.created_at : null);
      }
    }

    const missingIds = ids.filter((id) => !rolesByUserId.has(id));
    if (missingIds.length > 0) {
      const byUserIdProfiles = await supabase
        .from("profiles")
        .select("id,user_id,role,display_name,full_name,email,created_at")
        .in("user_id", missingIds);

      if (!byUserIdProfiles.error && byUserIdProfiles.data) {
        for (const row of byUserIdProfiles.data as Array<Record<string, unknown>>) {
          const userId = String(row.user_id ?? row.id ?? "");
          if (!userId) {
            continue;
          }
          rolesByUserId.set(userId, toRole(row.role));
          namesByUserId.set(
            userId,
            toDisplayName(row.display_name, toDisplayName(row.full_name, "")),
          );
          emailsByUserId.set(userId, toDisplayName(row.email, ""));
          createdAtByUserId.set(userId, typeof row.created_at === "string" ? row.created_at : null);
        }
      }
    }
  }

  const mappedFromAuth: AdminUserRecord[] = authUsers.map((user) => {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const nameFromMetadata = toDisplayName(
      metadata.display_name,
      toDisplayName(metadata.full_name, user.email ?? user.id),
    );
    const metadataRoleRaw = typeof metadata.role === "string" ? metadata.role.trim() : "";
    const roleFromMetadata = metadataRoleRaw ? toRole(metadataRoleRaw) : null;

    return {
      id: user.id,
      email: user.email ?? emailsByUserId.get(user.id) ?? "-",
      displayName: namesByUserId.get(user.id) || nameFromMetadata,
      role: roleFromMetadata ?? rolesByUserId.get(user.id) ?? "staff",
      createdAt: user.created_at ?? createdAtByUserId.get(user.id) ?? null,
    };
  });

  // Fallback: if auth list is empty/incomplete, include users from profiles table directly.
  const profileRows = await supabase
    .from("profiles")
    .select("id,user_id,role,display_name,full_name,email,created_at")
    .limit(300);

  if (!profileRows.error && profileRows.data) {
    const knownIds = new Set(mappedFromAuth.map((item) => item.id));
    for (const row of profileRows.data as Array<Record<string, unknown>>) {
      const userId = String(row.user_id ?? row.id ?? "");
      if (!userId || knownIds.has(userId)) {
        continue;
      }
      mappedFromAuth.push({
        id: userId,
        email: toDisplayName(row.email, "-"),
        displayName: toDisplayName(row.display_name, toDisplayName(row.full_name, userId)),
        role: toRole(row.role),
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
      });
      knownIds.add(userId);
    }
  }

  return mappedFromAuth;
}

export async function updateAdminUser(input: unknown) {
  await assertAdminRole();
  const parsed = UpdateAdminUserSchema.parse(input);
  const currentRole = await getProfileRole(parsed.userId);
  if (currentRole === "developer" || parsed.role === "developer") {
    assertDeveloperPin(parsed.developerPin);
  }
  const supabase = getSupabaseServiceRoleClient();

  const profilePayloads: Array<Record<string, unknown>> = [
    {
      user_id: parsed.userId,
      role: parsed.role,
      display_name: parsed.displayName,
      full_name: parsed.displayName,
    },
    {
      user_id: parsed.userId,
      role: parsed.role,
      display_name: parsed.displayName,
    },
    {
      user_id: parsed.userId,
      role: parsed.role,
      full_name: parsed.displayName,
    },
    {
      user_id: parsed.userId,
      role: parsed.role,
    },
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

  const upsertError = await upsertProfileCompat(supabase, profilePayloads);

  if (upsertError) {
    if (isProfilesRoleConstraintError(upsertError)) {
      throw new Error(profilesRoleConstraintHint());
    }
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
  authPayload.user_metadata = { role: parsed.role };
  if (parsed.displayName) {
    authPayload.user_metadata.display_name = parsed.displayName;
    authPayload.user_metadata.full_name = parsed.displayName;
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
  const currentRole = await getProfileRole(parsed.userId);
  if (currentRole === "developer") {
    assertDeveloperPin(parsed.developerPin);
  }
  const supabase = getSupabaseServiceRoleClient();

  const deleted = await supabase.auth.admin.deleteUser(parsed.userId);
  if (deleted.error) {
    throw new Error(`Failed to delete user: ${errorText(deleted.error, "Unknown error")}`);
  }

  const deleteById = await supabase.from("profiles").delete().eq("id", parsed.userId);
  if (deleteById.error && isMissingProfileColumnError(deleteById.error)) {
    await supabase.from("profiles").delete().eq("user_id", parsed.userId);
  }
  return { ok: true };
}
