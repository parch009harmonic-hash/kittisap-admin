import Link from "next/link";

import { requireDeveloper } from "../../../../lib/auth/admin";
import { getAdminLocale } from "../../../../lib/i18n/admin";
import DeveloperStatusClient from "../../../components/admin/developer/DeveloperStatusClient";

export default async function AdminDeveloperPage() {
  await requireDeveloper({ allowAdmin: true });
  const locale = await getAdminLocale();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              {locale === "th" ? "Debugger" : "Debugger"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">
              {locale === "th"
                ? "ตรวจ role ปัจจุบันจากฐานข้อมูลแบบเรียลไทม์"
                : "Check current DB role in real time"}
            </h2>
          </div>
          <Link
            href="/admin/developer/auth-role"
            className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            {locale === "th" ? "เปิดหน้า Debug สิทธิ์" : "Open Role Debug"}
          </Link>
        </div>
      </section>
      <DeveloperStatusClient mode="all" locale={locale} />
    </div>
  );
}
