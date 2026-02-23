"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminLocale } from "../../../../lib/i18n/admin";
import { UI_MAINTENANCE_PATHS, type UiMaintenanceRule, type UiPlatform, type UiRole } from "../../../../lib/maintenance/ui-maintenance";
import { assertApiSuccess } from "../api-error";

type SaveState = { path: string; loading: boolean; error: string | null };

const ROLE_LIST: UiRole[] = ["admin", "staff"];
const PLATFORM_LIST: UiPlatform[] = ["windows", "android", "ios"];

export default function UiAccessMonitorClient({ locale }: { locale: AdminLocale }) {
  const [rules, setRules] = useState<UiMaintenanceRule[]>([]);
  const [expandedPath, setExpandedPath] = useState<string | null>(UI_MAINTENANCE_PATHS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ path: "", loading: false, error: null });

  const t = useMemo(
    () =>
      locale === "th"
        ? {
            title: "ตรวจสอบ UI และการเข้าหน้า",
            subtitle: "จัดการการปิดหน้าแบบชั่วคราวสำหรับแอดมิน/พนักงาน แยกตาม Windows, Android, iOS",
            refresh: "รีเฟรช",
            loading: "กำลังโหลด...",
            enabled: "เปิดโหมดปรับปรุง",
            message: "ข้อความแสดงหน้า",
            save: "บันทึก",
            saving: "กำลังบันทึก...",
            closeNow: "ปิดหน้าชั่วคราว",
            openNow: "เปิดหน้า",
            roles: "บทบาท",
            platforms: "แพลตฟอร์ม",
            statusMatrix: "สถานะการเข้าหน้า",
            open: "เปิดใช้งาน",
            closed: "ปิดปรับปรุง",
            expand: "ดูรายละเอียด",
            collapse: "ย่อรายละเอียด",
            admin: "แอดมิน",
            staff: "พนักงาน",
            windows: "Windows",
            android: "Android",
            ios: "iOS",
            underMaintenance: "กำลังปรับปรุงระบบ",
            maintenanceHint: "หน้านี้อยู่ระหว่างปรับปรุงชั่วคราว",
          }
        : {
            title: "UI Access Monitor",
            subtitle: "Manage temporary page maintenance for admin/staff by Windows, Android, and iOS",
            refresh: "Refresh",
            loading: "Loading...",
            enabled: "Enable maintenance mode",
            message: "Maintenance message",
            save: "Save",
            saving: "Saving...",
            closeNow: "Close page now",
            openNow: "Open page now",
            roles: "Roles",
            platforms: "Platforms",
            statusMatrix: "Access Matrix",
            open: "Open",
            closed: "Maintenance",
            expand: "Expand",
            collapse: "Collapse",
            admin: "Admin",
            staff: "Staff",
            windows: "Windows",
            android: "Android",
            ios: "iOS",
            underMaintenance: "System Maintenance",
            maintenanceHint: "This page is temporarily under maintenance",
          },
    [locale],
  );

  const roleLabel: Record<UiRole, string> = { admin: t.admin, staff: t.staff };
  const platformLabel: Record<UiPlatform, string> = { windows: t.windows, android: t.android, ios: t.ios };

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/developer/ui-maintenance", { cache: "no-store" });
      const json = (await response.json()) as { ok: boolean; error?: string; rules?: UiMaintenanceRule[] };
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: "Failed to load rules",
        locale,
        requireOkField: true,
      });
      setRules(json.rules ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  function updateRule(path: string, update: Partial<UiMaintenanceRule>) {
    setRules((prev) => prev.map((item) => (item.path === path ? { ...item, ...update } : item)));
  }

  async function saveRule(rule: UiMaintenanceRule) {
    setSaveState({ path: rule.path, loading: true, error: null });
    try {
      const response = await fetch("/api/admin/developer/ui-maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: rule.path,
          enabled: rule.enabled,
          roles: rule.roles,
          platforms: rule.platforms,
          message: rule.message,
        }),
      });
      const json = (await response.json()) as { ok: boolean; error?: string; rule?: UiMaintenanceRule };
      assertApiSuccess({
        response,
        payload: json,
        fallbackMessage: "Failed to save rule",
        locale,
        requireOkField: true,
      });
      if (json.rule) {
        updateRule(rule.path, json.rule);
      }
      setSaveState({ path: "", loading: false, error: null });
    } catch (saveError) {
      setSaveState({
        path: rule.path,
        loading: false,
        error: saveError instanceof Error ? saveError.message : "Unknown error",
      });
    }
  }

  async function toggleRuleEnabled(rule: UiMaintenanceRule, enabled: boolean) {
    const nextRule: UiMaintenanceRule = { ...rule, enabled };
    updateRule(rule.path, { enabled });
    await saveRule(nextRule);
  }

  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">{t.title}</p>
          <p className="mt-1 text-sm text-slate-300">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadRules()}
          disabled={loading}
          className="rounded-lg border border-cyan-300/70 bg-cyan-400/20 px-3 py-2 text-xs font-semibold text-cyan-100 disabled:opacity-60"
        >
          {loading ? t.loading : t.refresh}
        </button>
      </div>

      {error ? <p className="mt-3 rounded-lg bg-rose-900/40 p-2 text-xs text-rose-100">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {rules.map((rule) => {
          const isExpanded = expandedPath === rule.path;
          const isSaving = saveState.loading && saveState.path === rule.path;
          return (
            <article key={rule.path} className="rounded-xl border border-slate-700 bg-slate-950/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-100">{rule.path}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                      rule.enabled ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-200"
                    }`}
                  >
                    {rule.enabled ? (
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-300" />
                    ) : (
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                    )}
                    {rule.enabled ? t.closed : t.open}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedPath(isExpanded ? null : rule.path)}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                >
                  {isExpanded ? t.collapse : t.expand}
                </button>
              </div>

              {isExpanded ? (
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2 text-xs text-slate-200">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => updateRule(rule.path, { enabled: event.target.checked })}
                    />
                    {t.enabled}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleRuleEnabled(rule, true)}
                      disabled={isSaving}
                      className="rounded-md border border-amber-500/60 bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-100"
                    >
                      {t.closeNow}
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleRuleEnabled(rule, false)}
                      disabled={isSaving}
                      className="rounded-md border border-emerald-500/60 bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-100"
                    >
                      {t.openNow}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-300">{t.roles}</p>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_LIST.map((role) => {
                        const checked = rule.roles.includes(role);
                        return (
                          <label key={role} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...rule.roles, role]
                                  : rule.roles.filter((item) => item !== role);
                                updateRule(rule.path, { roles: next.length > 0 ? next : [role] });
                              }}
                            />
                            {roleLabel[role]}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-300">{t.platforms}</p>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_LIST.map((platform) => {
                        const checked = rule.platforms.includes(platform);
                        return (
                          <label key={platform} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const next = event.target.checked
                                  ? [...rule.platforms, platform]
                                  : rule.platforms.filter((item) => item !== platform);
                                updateRule(rule.path, { platforms: next.length > 0 ? next : [platform] });
                              }}
                            />
                            {platformLabel[platform]}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-300">{t.message}</span>
                    <input
                      type="text"
                      value={rule.message}
                      onChange={(event) => updateRule(rule.path, { message: event.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => void saveRule(rule)}
                    disabled={isSaving}
                    className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"
                  >
                    {isSaving ? t.saving : t.save}
                  </button>
                  {saveState.error && saveState.path === rule.path ? (
                    <p className="rounded-md bg-rose-900/40 p-2 text-xs text-rose-100">{saveState.error}</p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/45 p-3">
        <p className="text-sm font-semibold text-cyan-200">{t.statusMatrix}</p>
        <div className="mt-2 overflow-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-1 text-left">Path</th>
                {ROLE_LIST.map((role) =>
                  PLATFORM_LIST.map((platform) => (
                    <th key={`${role}-${platform}`} className="px-2 py-1 text-left">{`${roleLabel[role]} / ${platformLabel[platform]}`}</th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={`matrix-${rule.path}`} className="border-t border-slate-800">
                  <td className="px-2 py-1 text-slate-200">{rule.path}</td>
                  {ROLE_LIST.map((role) =>
                    PLATFORM_LIST.map((platform) => {
                      const blocked = rule.enabled && rule.roles.includes(role) && rule.platforms.includes(platform);
                      return (
                        <td key={`${rule.path}-${role}-${platform}`} className="px-2 py-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                              blocked ? "bg-amber-500/25 text-amber-200" : "bg-emerald-500/25 text-emerald-200"
                            }`}
                          >
                            {blocked ? (
                              <>
                                <span className="inline-block h-2 w-2 animate-spin rounded-full border border-amber-300 border-t-transparent" />
                                {t.closed}
                              </>
                            ) : (
                              t.open
                            )}
                          </span>
                        </td>
                      );
                    }),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-xs text-amber-100">
        <p className="font-semibold">{t.underMaintenance}</p>
        <p className="mt-1">{t.maintenanceHint}</p>
      </div>
    </section>
  );
}
