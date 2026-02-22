"use client";

import type { AdminLocale } from "../../../../lib/i18n/admin";

type VercelObservabilityClientProps = {
  locale: AdminLocale;
  projectObservabilityUrl: string | null;
  dashboardObservabilityUrl: string;
  teamSlug: string | null;
  projectSlug: string | null;
};

export default function VercelObservabilityClient({
  locale,
  projectObservabilityUrl,
  dashboardObservabilityUrl,
  teamSlug,
  projectSlug,
}: VercelObservabilityClientProps) {
  const text =
    locale === "th"
      ? {
          title: "Vercel Observability",
          subtitle: "เข้าเมนู Observability ของ Vercel ได้จากหน้า Developer Console โดยตรง",
          projectBtn: "เปิด Observability (Project)",
          dashboardBtn: "เปิด Observability (Dashboard)",
          noteReady: "พร้อมใช้งาน",
          noteMissing: "ยังไม่ได้ตั้งค่า VERCEL_TEAM_SLUG หรือ VERCEL_PROJECT_SLUG",
          hint: "ถ้ายังไม่ขึ้นลิงก์ระดับโปรเจกต์ ให้เพิ่ม env: VERCEL_TEAM_SLUG และ VERCEL_PROJECT_SLUG แล้ว redeploy",
          detected: "ค่าที่ตรวจพบ",
          team: "ทีม",
          project: "โปรเจกต์",
          missing: "ไม่พบ",
        }
      : {
          title: "Vercel Observability",
          subtitle: "Open Vercel Observability directly from Developer Console",
          projectBtn: "Open Observability (Project)",
          dashboardBtn: "Open Observability (Dashboard)",
          noteReady: "Ready",
          noteMissing: "Missing VERCEL_TEAM_SLUG or VERCEL_PROJECT_SLUG",
          hint: "Set VERCEL_TEAM_SLUG and VERCEL_PROJECT_SLUG, then redeploy to enable project link.",
          detected: "Detected values",
          team: "Team",
          project: "Project",
          missing: "missing",
        };

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{text.title}</p>
      <h2 className="mt-1 text-xl font-semibold text-white">{text.subtitle}</h2>

      <div className="mt-4 flex flex-wrap gap-3">
        {projectObservabilityUrl ? (
          <a
            href={projectObservabilityUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            {text.projectBtn}
          </a>
        ) : (
          <span className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
            {text.noteMissing}
          </span>
        )}

        <a
          href={dashboardObservabilityUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-4 py-2 text-sm font-semibold text-cyan-100"
        >
          {text.dashboardBtn}
        </a>
      </div>

      <p className="mt-3 text-xs text-slate-300">{projectObservabilityUrl ? text.noteReady : text.hint}</p>
      <p className="mt-2 text-xs text-slate-400">
        {text.detected}: {text.team}={teamSlug ?? text.missing}, {text.project}={projectSlug ?? text.missing}
      </p>
    </section>
  );
}
