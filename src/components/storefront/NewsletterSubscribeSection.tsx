"use client";

import { FormEvent, useState } from "react";

type NewsletterSubscribeSectionProps = {
  title: string;
  subtitle: string;
  nameLabel: string;
  emailLabel: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  ctaLabel: string;
  successMessage: string;
  errorMessage: string;
};

export function NewsletterSubscribeSection(props: NewsletterSubscribeSectionProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: "idle" | "success" | "error"; message: string | null }>({
    tone: "idle",
    message: null,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ tone: "idle", message: null });
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ fullName, email }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || props.errorMessage);
      }
      setStatus({ tone: "success", message: props.successMessage });
      setFullName("");
      setEmail("");
    } catch (error) {
      setStatus({
        tone: "error",
        message: `${props.errorMessage}: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4" style={{ marginTop: "1.25rem", marginBottom: "2.2rem" }}>
      <div className="relative overflow-hidden rounded-3xl border border-slate-300/20 bg-[linear-gradient(145deg,rgba(15,23,42,0.94),rgba(2,6,23,0.96))] p-6 shadow-[0_18px_55px_rgba(2,6,23,0.4)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">Newsletter</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-100 md:text-3xl">{props.title}</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-300/80">{props.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{props.nameLabel}</label>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={props.namePlaceholder}
              className="mt-1 w-full rounded-xl border border-slate-200/20 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400/80 focus:border-cyan-300 focus:outline-none"
              maxLength={120}
              required
            />

            <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">{props.emailLabel}</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={props.emailPlaceholder}
              className="mt-1 w-full rounded-xl border border-slate-200/20 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400/80 focus:border-cyan-300 focus:outline-none"
              maxLength={160}
              required
            />

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className={`text-xs ${status.tone === "error" ? "text-rose-300" : status.tone === "success" ? "text-emerald-300" : "text-slate-300/70"}`}>{status.message}</p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center rounded-xl border border-amber-300/35 bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-400/25 disabled:opacity-60"
              >
                {isSubmitting ? "..." : props.ctaLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
