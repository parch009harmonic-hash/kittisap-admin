"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";

type HealthPart = {
  ok: boolean;
  latencyMs: number | null;
  error?: string;
};

type DeveloperStatus = {
  ok: boolean;
  checkedAt: string;
  api: HealthPart;
  db: HealthPart;
  storage: HealthPart;
  runtime: {
    node: string;
    uptimeSec: number;
    env: string;
  };
  supabase: {
    urlConfigured: boolean;
    anonKeyConfigured: boolean;
    serviceRoleConfigured: boolean;
    projectRef: string | null;
  };
  vercel: {
    isVercel: boolean;
    env: string;
    projectIdConfigured: boolean;
    gitCommitSha: string | null;
  };
  source: {
    files: number;
    bytes: number;
  };
  error?: string;
};

function statusLabel(part: HealthPart) {
  if (!part.ok) {
    return `DOWN (${part.error ?? "error"})`;
  }

  return `OK (${part.latencyMs ?? "-"} ms)`;
}

function boolLabel(value: boolean) {
  return value ? "OK" : "MISSING";
}

export default function DeveloperConsole() {
  const [payload, setPayload] = useState<DeveloperStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/developer/status", { cache: "no-store" });
      const json = (await response.json()) as DeveloperStatus;
      setPayload(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 30000);

    return () => {
      clearInterval(timer);
    };
  }, [load]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-cyan-400/25 bg-slate-900/60 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Developer Monitor</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">System + API + Infra</h2>
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          disabled={loading}
          className="mt-3 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </section>

      {payload ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title="API Health">
            <Line label="API" value={statusLabel(payload.api)} />
            <Line label="Database" value={statusLabel(payload.db)} />
            <Line label="Storage" value={statusLabel(payload.storage)} />
          </Card>

          <Card title="Runtime">
            <Line label="Node" value={payload.runtime.node} />
            <Line label="Environment" value={payload.runtime.env} />
            <Line label="Uptime" value={`${payload.runtime.uptimeSec}s`} />
          </Card>

          <Card title="Supabase">
            <Line label="Project" value={payload.supabase.projectRef ?? "-"} />
            <Line label="URL" value={boolLabel(payload.supabase.urlConfigured)} />
            <Line label="Anon Key" value={boolLabel(payload.supabase.anonKeyConfigured)} />
            <Line label="Service Role" value={boolLabel(payload.supabase.serviceRoleConfigured)} />
          </Card>

          <Card title="Vercel">
            <Line label="Platform" value={boolLabel(payload.vercel.isVercel)} />
            <Line label="Environment" value={payload.vercel.env} />
            <Line label="Project ID" value={boolLabel(payload.vercel.projectIdConfigured)} />
            <Line label="Commit" value={payload.vercel.gitCommitSha ?? "-"} />
          </Card>

          <Card title="Code Audit">
            <Line label="Files" value={String(payload.source.files)} />
            <Line label="Size" value={`${(payload.source.bytes / 1024 / 1024).toFixed(2)} MB`} />
            <Line label="Checked" value={new Date(payload.checkedAt).toLocaleString()} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-cyan-300">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-4 border-b border-slate-800 py-1 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-100">{value}</span>
    </p>
  );
}
