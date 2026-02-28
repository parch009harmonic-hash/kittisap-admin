import "server-only";

import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "../supabase/server";

export type CustomerProfilePayload = {
  id: string;
  full_name: string;
  phone: string;
  address?: string;
};

function isMissingProfileColumnError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  return message.includes("column") && (message.includes("does not exist") || message.includes("schema cache"));
}

async function upsertCustomerRoleProfile(userId: string) {
  const supabase = await getSupabaseServerClient();
  const payloads: Array<Record<string, unknown>> = [
    { id: userId, role: "customer" },
    { user_id: userId, role: "customer" },
  ];

  for (const payload of payloads) {
    const onConflict = "id" in payload ? "id" : "user_id";
    const attempt = await supabase.from("profiles").upsert(payload, { onConflict });
    if (!attempt.error) {
      return;
    }
    if (isMissingProfileColumnError(attempt.error)) {
      continue;
    }
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function guessFullName(user: User) {
  const fullName = asString(user.user_metadata?.full_name)
    || asString(user.user_metadata?.name)
    || asString(user.user_metadata?.display_name)
    || asString(user.user_metadata?.user_name);

  if (fullName) {
    return fullName;
  }

  const email = asString(user.email);
  if (!email) {
    return "";
  }

  return email.split("@")[0] ?? "";
}

function guessPhone(user: User) {
  return asString(user.user_metadata?.phone)
    || asString(user.user_metadata?.phone_number)
    || asString(user.phone);
}

function guessAddress(user: User) {
  return asString(user.user_metadata?.address)
    || asString(user.user_metadata?.shipping_address)
    || asString(user.user_metadata?.location);
}

export function toCustomerProfilePayload(user: User, input?: { fullName?: string; phone?: string; address?: string }): CustomerProfilePayload {
  const fullName = asString(input?.fullName) || guessFullName(user);
  const phone = asString(input?.phone) || guessPhone(user);
  const address = asString(input?.address) || guessAddress(user);

  return {
    id: user.id,
    full_name: fullName,
    phone,
    address,
  };
}

export async function upsertCustomerProfileForSessionUser(input?: { fullName?: string; phone?: string; address?: string }) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  const payload = toCustomerProfilePayload(data.user, input);
  const upsertAttempt = await supabase.from("customer_profiles").upsert(payload, { onConflict: "id" });

  if (upsertAttempt.error) {
    if (!isMissingProfileColumnError(upsertAttempt.error)) {
      throw new Error(upsertAttempt.error.message);
    }

    // Fallback for environments where `address` column is not deployed yet.
    const fallbackPayload = { id: payload.id, full_name: payload.full_name, phone: payload.phone };
    const fallbackAttempt = await supabase.from("customer_profiles").upsert(fallbackPayload, { onConflict: "id" });
    if (fallbackAttempt.error) {
      throw new Error(fallbackAttempt.error.message);
    }
  }

  await upsertCustomerRoleProfile(data.user.id);

  return payload;
}

export async function upsertCustomerProfileAndRoleForSessionUser(input?: { fullName?: string; phone?: string; address?: string }) {
  return upsertCustomerProfileForSessionUser(input);
}
