"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminLocale } from "../../../../lib/i18n/admin";
import { assertApiSuccess } from "../api-error";

type DebugPayload = {
  ok: boolean;
  checkedAt: string;
  auth?: { id: string; email: string | null };
  role?: {
    resolved: string;
    fromProfiles: string | null;
    source: "profiles.id" | "profiles.user_id" | "none";
    isBackoffice: boolean;
  };
  customerProfile?: { exists: boolean; fullName: string | null; phone: string | null };
  errors?: { profiles: string | null; customerProfiles: string | null };
};

type RowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

function Row({ label, value, mono = false }: RowProps) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 break-all text-sm text-slate-100 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

export default function DeveloperRoleDebugClient({ locale }: { locale: AdminLocale }) {
  const [data, setData] = useState<DebugPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(
    () =>
      locale === "th"
        ? {
            title: "ตรวจสิทธิ์ผู้ใช้จากฐานข้อมูล (Realtime)",
            subtitle: "เช็ก role ปัจจุบันจาก profiles และสถานะ customer_profiles",
            refresh: "รีเฟรช",
            refreshing: "กำลังตรวจสอบ...",
            checkedAt: "ตรวจล่าสุด",
            userId: "User ID",
            email: "อีเมล",
            resolvedRole: "Role ที่ระบบใช้จริง",
            roleFromProfiles: "Role จาก profiles",
            roleSource: "แหล่งข้อมูล role",
            backofficeAccess: "สิทธิ์เข้า Backoffice",
            customerProfile: "ข้อมูล customer profile",
            exists: "มีข้อมูล",
            yes: "ใช่",
            no: "ไม่ใช่",
            profileError: "Profiles error",
            customerError: "Customer profile error",
          }
        : {
            title: "Realtime Role Debug from DB",
            subtitle: "Check current role from profiles and customer_profiles.",
            refresh: "Refresh",
            refreshing: "Checking...",
            checkedAt: "Checked at",
            userId: "User ID",
            email: "Email",
            resolvedRole: "Resolved role",
            roleFromProfiles: "Role from profiles",
            roleSource: "Role source",
            backofficeAccess: "Backoffice access",
            customerProfile: "Customer profile",
            exists: "Exists",
            yes: "Yes",
            no: "No",
            profileError: "Profiles error",
            customerError: "Customer profile error",
          },
    [locale],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/developer/auth-role", { cache: "no-store" });
      const json = (await response.json()) as DebugPayload;
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: "Failed to load role debug",
        locale,
      });
      setData(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to load role debug");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{t.title}</h2>
          <p className="mt-1 text-sm text-slate-300">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
        >
          {loading ? t.refreshing : t.refresh}
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-400/35 bg-rose-900/30 p-3 text-sm text-rose-100">{error}</p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Row label={t.checkedAt} value={data?.checkedAt ?? "-"} />
        <Row label={t.userId} value={data?.auth?.id ?? "-"} mono />
        <Row label={t.email} value={data?.auth?.email ?? "-"} />
        <Row label={t.resolvedRole} value={data?.role?.resolved ?? "-"} />
        <Row label={t.roleFromProfiles} value={data?.role?.fromProfiles ?? "-"} />
        <Row label={t.roleSource} value={data?.role?.source ?? "-"} />
        <Row label={t.backofficeAccess} value={data?.role?.isBackoffice ? t.yes : t.no} />
        <Row
          label={t.customerProfile}
          value={`${t.exists}: ${data?.customerProfile?.exists ? t.yes : t.no}`}
        />
        <Row label={t.profileError} value={data?.errors?.profiles ?? "-"} />
        <Row label={t.customerError} value={data?.errors?.customerProfiles ?? "-"} />
      </div>
    </section>
  );
}

