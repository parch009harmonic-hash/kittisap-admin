import "server-only";

import { z } from "zod";

import { getAdminActor, requireAdminApi } from "../auth/admin";
import { getSupabaseServiceRoleClient } from "../supabase/service";
import { sendBroadcastEmail } from "../notifications/broadcast-email";

const BROADCAST_CONCURRENCY = 6;

const NewsletterSubscribeSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
});

const NewsletterSubscriberAdminUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160),
});

const BroadcastComposeSchema = z
  .object({
    mode: z.enum(["all", "single"]),
    targetSubscriberId: z.string().trim().uuid().optional(),
    subject: z.string().trim().min(1).max(160),
    headline: z.string().trim().min(1).max(160),
    message: z.string().trim().min(1).max(4000),
    imageUrl: z.string().trim().url().or(z.literal("")).default(""),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "single" && !value.targetSubscriberId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target subscriber is required for single send mode.",
        path: ["targetSubscriberId"],
      });
    }
  });

export type NewsletterSubscriber = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  unsubscribedAt: string | null;
  createdAt: string;
};

export type BroadcastSummary = {
  broadcastId: string;
  mode: "all" | "single";
  sentCount: number;
  failedCount: number;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function mapSubscriber(row: Record<string, unknown>): NewsletterSubscriber {
  return {
    id: String(row.id ?? ""),
    fullName: String(row.full_name ?? ""),
    email: String(row.email ?? ""),
    isActive: Boolean(row.is_active ?? true),
    unsubscribedAt: row.unsubscribed_at ? String(row.unsubscribed_at) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

type PurgeSummary = {
  ran: boolean;
  deletedCount: number;
};

export async function purgeInactiveSubscribersOnMonth30(input?: { force?: boolean }): Promise<PurgeSummary> {
  const now = new Date();
  if (!input?.force && now.getDate() !== 30) {
    return { ran: false, deletedCount: 0 };
  }

  const supabase = getSupabaseServiceRoleClient();
  const cutoffIso = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const { count, error } = await supabase
    .from("newsletter_subscribers")
    .delete({ count: "exact" })
    .eq("is_active", false)
    .lt("unsubscribed_at", cutoffIso);

  if (error) {
    throw new Error(`Failed to purge inactive subscribers: ${error.message}`);
  }

  return { ran: true, deletedCount: count ?? 0 };
}

export async function subscribeNewsletter(input: unknown) {
  const parsed = NewsletterSubscribeSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const payload = {
    full_name: parsed.fullName,
    email: normalizeEmail(parsed.email),
    is_active: true,
    unsubscribed_at: null,
  };

  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .upsert(payload, { onConflict: "email" })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to subscribe newsletter: ${error.message}`);
  }

  return mapSubscriber(data as Record<string, unknown>);
}

export async function listNewsletterSubscribersApi(options?: { includeInactive?: boolean }) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage broadcast");
  }

  await purgeInactiveSubscribersOnMonth30();

  const supabase = getSupabaseServiceRoleClient();
  let query = supabase
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load subscribers: ${error.message}`);
  }

  return (data ?? []).map((row) => mapSubscriber(row as Record<string, unknown>));
}

export async function updateNewsletterSubscriberApi(subscriberId: string, input: unknown) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage broadcast");
  }

  const parsed = NewsletterSubscriberAdminUpdateSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .update({
      full_name: parsed.fullName,
      email: normalizeEmail(parsed.email),
    })
    .eq("id", subscriberId)
    .eq("is_active", true)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update subscriber: ${error.message}`);
  }
  if (!data) {
    throw new Error("Subscriber not found");
  }

  return mapSubscriber(data as Record<string, unknown>);
}

export async function deleteNewsletterSubscriberApi(subscriberId: string) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage broadcast");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", subscriberId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to delete subscriber: ${error.message}`);
  }
}

export async function hardDeleteNewsletterSubscriberApi(subscriberId: string) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage broadcast");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .delete()
    .eq("id", subscriberId)
    .eq("is_active", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to permanently delete subscriber: ${error.message}`);
  }
  if (!data) {
    throw new Error("Only inactive subscriber can be permanently deleted");
  }
}

export async function restoreNewsletterSubscriberApi(subscriberId: string) {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage broadcast");
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .update({
      is_active: true,
      unsubscribed_at: null,
    })
    .eq("id", subscriberId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to restore subscriber: ${error.message}`);
  }
  if (!data) {
    throw new Error("Subscriber not found");
  }

  return mapSubscriber(data as Record<string, unknown>);
}

export async function sendBroadcastApi(input: unknown): Promise<BroadcastSummary> {
  await requireAdminApi();
  const actor = await getAdminActor();
  if (!actor || actor.role !== "admin") {
    throw new Error("Not authorized to manage broadcast");
  }

  const parsed = BroadcastComposeSchema.parse(input);
  const supabase = getSupabaseServiceRoleClient();

  let query = supabase
    .from("newsletter_subscribers")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (parsed.mode === "single" && parsed.targetSubscriberId) {
    query = query.eq("id", parsed.targetSubscriberId);
  }

  const { data: targetRows, error: targetError } = await query;
  if (targetError) {
    throw new Error(`Failed to resolve subscribers: ${targetError.message}`);
  }

  const recipients = (targetRows ?? []).map((row) => mapSubscriber(row as Record<string, unknown>));
  if (recipients.length === 0) {
    throw new Error("No subscribers found for this send mode");
  }

  const { data: broadcastRow, error: insertBroadcastError } = await supabase
    .from("broadcast_messages")
    .insert({
      mode: parsed.mode,
      target_subscriber_id: parsed.mode === "single" ? parsed.targetSubscriberId ?? null : null,
      subject: parsed.subject,
      headline: parsed.headline,
      message: parsed.message,
      image_url: parsed.imageUrl || null,
      sent_by: actor.user.id,
      sent_count: 0,
      failed_count: 0,
    })
    .select("id")
    .single();

  if (insertBroadcastError) {
    throw new Error(`Failed to create broadcast log: ${insertBroadcastError.message}`);
  }

  const broadcastId = String((broadcastRow as { id: string }).id);
  let sentCount = 0;
  let failedCount = 0;
  let recipientIndex = 0;

  const workerCount = Math.min(BROADCAST_CONCURRENCY, recipients.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const current = recipientIndex;
        recipientIndex += 1;
        if (current >= recipients.length) {
          break;
        }

        const recipient = recipients[current];
        let status: "sent" | "failed" = "sent";
        let errorMessage: string | null = null;

        try {
          await sendBroadcastEmail({
            toEmail: recipient.email,
            recipientName: recipient.fullName,
            subject: parsed.subject,
            headline: parsed.headline,
            message: parsed.message,
            imageUrl: parsed.imageUrl || null,
          });
        } catch (error) {
          status = "failed";
          errorMessage = error instanceof Error ? error.message : "Unknown error";
        }

        const { error: logError } = await supabase.from("broadcast_recipients").insert({
          broadcast_message_id: broadcastId,
          subscriber_id: recipient.id,
          email_snapshot: recipient.email,
          status,
          error_message: errorMessage,
        });

        if (logError && status === "sent") {
          status = "failed";
          errorMessage = `Log insert failed: ${logError.message}`;
        }

        if (status === "sent") {
          sentCount += 1;
        } else {
          failedCount += 1;
        }
      }
    }),
  );

  await supabase
    .from("broadcast_messages")
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq("id", broadcastId);

  return {
    broadcastId,
    mode: parsed.mode,
    sentCount,
    failedCount,
  };
}
