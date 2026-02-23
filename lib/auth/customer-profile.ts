import "server-only";

import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "../supabase/server";

export type CustomerProfilePayload = {
  id: string;
  full_name: string;
  phone: string;
};

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

export function toCustomerProfilePayload(user: User, input?: { fullName?: string; phone?: string }): CustomerProfilePayload {
  const fullName = asString(input?.fullName) || guessFullName(user);
  const phone = asString(input?.phone) || guessPhone(user);

  return {
    id: user.id,
    full_name: fullName,
    phone,
  };
}

export async function upsertCustomerProfileForSessionUser(input?: { fullName?: string; phone?: string }) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Unauthorized");
  }

  const payload = toCustomerProfilePayload(data.user, input);
  const { error: upsertError } = await supabase
    .from("customer_profiles")
    .upsert(payload, { onConflict: "id" });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return payload;
}
