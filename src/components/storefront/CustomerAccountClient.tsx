"use client";

import { FormEvent, useEffect, useState } from "react";

type ProfileDto = {
  id: string;
  full_name: string;
  phone: string;
  line_id?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export function CustomerAccountClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/customer/profile", { cache: "no-store" });
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }

        const payload = (await response.json()) as { ok?: boolean; error?: string; data?: ProfileDto | null };
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Failed to load profile");
        }

        if (!mounted) return;
        setProfile(payload.data ?? null);
        setFullName(payload.data?.full_name ?? "");
        setPhone(payload.data?.phone ?? "");
      } catch (caught) {
        if (!mounted) return;
        setError(caught instanceof Error ? caught.message : "Failed to load profile");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/customer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string; data?: ProfileDto };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to save profile");
      }

      setProfile(payload.data);
      setMessage("บันทึกข้อมูลเรียบร้อย");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <header className="rounded-3xl border border-amber-500/35 bg-black/55 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <h1 className="text-3xl font-semibold text-amber-300">บัญชีลูกค้า</h1>
          <p className="mt-2 text-sm text-amber-100/75">จัดการข้อมูลโปรไฟล์สำหรับการสั่งซื้อและติดต่อกลับ</p>
        </header>

        <section className="mt-6 rounded-2xl border border-amber-500/25 bg-black/45 p-5">
          {loading ? <p className="text-sm text-amber-100/70">Loading...</p> : null}
          {error ? <p className="mb-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
          {message ? <p className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

          {!loading ? (
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-amber-100/80">ชื่อ-นามสกุล</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="w-full rounded-xl border border-amber-500/35 bg-black/50 px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-300"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-amber-100/80">เบอร์โทร</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-xl border border-amber-500/35 bg-black/50 px-3 py-2 text-sm text-amber-50 outline-none focus:border-amber-300"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="rounded-full border border-amber-400/70 bg-amber-400/25 px-5 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "บันทึกข้อมูล"}
              </button>
            </form>
          ) : null}

          {profile?.created_at ? <p className="mt-3 text-xs text-amber-100/60">Created: {new Date(profile.created_at).toLocaleString()}</p> : null}
        </section>
      </section>
    </main>
  );
}
